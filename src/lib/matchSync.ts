/**
 * Sincroniza partidas pendentes do Hub com partidas encerradas no Valorant (API Henrik).
 * Usado pelo cron /api/cron/check-matches.
 */
import { prisma } from "@/src/lib/prisma";
import {
  getRecentCustomMatches,
  getMatchByMatchId,
  VALORANT_RATE_LIMIT_ERROR,
  type ValorantMatch,
  type ValorantMatchDetails,
} from "@/src/lib/valorant";
import { invalidateQueueStatusCache } from "@/src/lib/redis";
import { verifyAndCompleteMissions } from "@/src/lib/missions/verify";
import { levelFromXp } from "@/src/lib/xpLevel";
import type { Prisma } from "@prisma/client";

const MIN_ELO = 0;
const MAX_ELO = 20;
const ELO_WIN = 1;
const ELO_LOSS = 1;

/** HEX - Hub Expresso Rating: ganho por vitória / perda por derrota. */
const HEX_WIN = 25;
const HEX_LOSS = 20;
const HEX_LOSS_REDUCED = 10; // time perdedor quando há troll: não-trolls perdem menos
const HEX_LOSS_TROLL = 60; // troll no time perdedor perde o triplo (3x 20)

const XP_PER_MATCH_PLAYED = 10;
const XP_MATCH_WIN_BONUS = 5;
const TROLL_BADGE = "troll";

const MATCH_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4h
const DELAY_MS = 3000; // 3s entre requests
const LAST_SYNC_CHECK_MS = 1 * 60 * 1000; // 1min – rechecagem de partidas em andamento

type UserNums = {
  elo: number | null;
  xp: number | null;
  hex: number | null;
};

type MatchWithParticipants = Prisma.GameMatchGetPayload<{
  include: {
    participants: {
      include: {
        user: {
          select: {
            id: true;
            riotId: true;
            tagline: true;
            profileBadge: true;
          };
        };
      };
    };
  };
}>;

function normalizeRiotKey(name: string, tag: string): string {
  return `${String(name || "").trim().toLowerCase()}#${String(tag || "").trim().toLowerCase()}`;
}

function normalizeTeam(s: unknown): "red" | "blue" | null {
  const v = String(s ?? "").trim().toLowerCase();
  if (v === "red") return "red";
  if (v === "blue") return "blue";
  return null;
}

function getMatchIdFromMetadata(m: ValorantMatch): string | null {
  const meta = m?.metadata as { matchid?: string; match_id?: string } | undefined;
  const id = meta?.matchid ?? meta?.match_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function isMatchCompleted(m: ValorantMatch): boolean {
  const meta = m?.metadata as { is_completed?: boolean; rounds_played?: number } | undefined;
  if (meta?.is_completed === true) return true;
  const rounds = meta?.rounds_played;
  return typeof rounds === "number" && rounds > 0;
}

function getDetailsMapName(details: ValorantMatchDetails): string | null {
  const meta = details?.metadata as any;
  const mapFromObj = meta?.map?.name;
  const mapFromFlat = meta?.map_name;
  const map = mapFromObj ?? mapFromFlat;
  return typeof map === "string" && map.trim() ? map.trim() : null;
}

function computeWinnerTeam(details: ValorantMatchDetails): "red" | "blue" | null {
  const teams = details.teams as
    | { red?: { has_won?: boolean; rounds_won?: number }; blue?: { has_won?: boolean; rounds_won?: number } }
    | Array<{ team_id?: string; has_won?: boolean; rounds_won?: number }>
    | undefined;

  let redWon = false;
  let blueWon = false;
  let redRounds = 0;
  let blueRounds = 0;

  if (teams && !Array.isArray(teams)) {
    redWon = teams.red?.has_won === true;
    blueWon = teams.blue?.has_won === true;
    redRounds = teams.red?.rounds_won ?? 0;
    blueRounds = teams.blue?.rounds_won ?? 0;
  } else if (Array.isArray(teams)) {
    for (const t of teams) {
      const id = String(t.team_id ?? "").toLowerCase();
      if (id === "red") {
        if (t.has_won) redWon = true;
        redRounds = t.rounds_won ?? redRounds;
      }
      if (id === "blue") {
        if (t.has_won) blueWon = true;
        blueRounds = t.rounds_won ?? blueRounds;
      }
    }
  }

  if (redWon) return "red";
  if (blueWon) return "blue";
  if (redRounds > blueRounds) return "red";
  if (blueRounds > redRounds) return "blue";
  return null;
}

function getAllPlayers(details: ValorantMatchDetails) {
  const playersRaw = details.players as { all_players?: unknown[] } | unknown[] | undefined;
  const allPlayers = Array.isArray(playersRaw) ? playersRaw : (playersRaw?.all_players ?? []);
  return allPlayers as Array<{
    name?: string;
    tag?: string;
    team?: string;
    stats?: { kills?: number; deaths?: number; assists?: number; score?: number };
  }>;
}

async function touchMatchUpdatedAt(matchDbId: number) {
  // só “encosta” no registro pra updatedAt mudar
  try {
    await prisma.gameMatch.update({
      where: { id: matchDbId },
      data: { updatedAt: new Date() },
    });
  } catch {
    // ignore
  }
}

export type SyncResult = {
  checked: number;
  updated: number;
  errors: string[];
};

async function sendDiscordMatchSyncWebhook(result: SyncResult, startedAt: Date, endedAt: Date) {
  const url = process.env.DISCORD_MATCH_SYNC_WEBHOOK;
  if (!url) return;

  const color = result.errors.length > 0 ? 0xff5c5c : 0x57f287;
  const notFinished = Math.max(0, result.checked - result.updated);
  const maxErrorsShown = 8;
  const errorsPreview =
    result.errors.length > 0
      ? result.errors.slice(0, maxErrorsShown).join("\n") +
        (result.errors.length > maxErrorsShown ? `\n...(+${result.errors.length - maxErrorsShown} mais)` : "")
      : "Nenhum";

  const embed = {
    title: "Cron: Sincronização de partidas",
    description: "O cron de sincronização foi ativado e executado.",
    color,
    fields: [
      { name: "Partidas verificadas", value: String(result.checked), inline: true },
      { name: "Partidas sincronizadas", value: String(result.updated), inline: true },
      { name: "Partidas não finalizadas", value: String(notFinished), inline: true },
      { name: "Erros", value: errorsPreview, inline: false },
      { name: "Iniciado em", value: startedAt.toISOString(), inline: true },
      { name: "Finalizado em", value: endedAt.toISOString(), inline: true },
    ],
    footer: { text: "Hub - matchSync" },
    timestamp: endedAt.toISOString(),
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch {
    // ignore
  }
}

function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function syncPendingMatchesFromRiot(): Promise<SyncResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  let updated = 0;

  const cutoff = new Date(Date.now() - MATCH_MAX_AGE_MS);
  const lastSyncCutoff = new Date(Date.now() - LAST_SYNC_CHECK_MS);

  const pendingMatches = (await prisma.gameMatch.findMany({
    where: {
      status: { in: ["pending", "in_progress"] },
      createdAt: { gte: cutoff },
      updatedAt: { lte: lastSyncCutoff },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, riotId: true, tagline: true, profileBadge: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  })) as MatchWithParticipants[];

  for (const match of pendingMatches) {
    const participants = match.participants.filter((p) => p.user.riotId && p.user.tagline);
    if (participants.length === 0) {
      await touchMatchUpdatedAt(match.id);
      continue;
    }

    const creator = participants.find((p) => p.userId === match.creatorId) ?? participants[0];
    const name = creator.user.riotId!.trim();
    const tag = creator.user.tagline!.trim();

    await new Promise((r) => setTimeout(r, DELAY_MS));

    let recentData: { data?: ValorantMatch[] } | null = null;
    try {
      recentData = await getRecentCustomMatches(name, tag, 10);
    } catch (e) {
      if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) {
        errors.push(`[${match.matchId}] Rate limit da API Riot (recentCustoms)`);
      } else {
        errors.push(`[${match.matchId}] Erro recentCustoms: ${e instanceof Error ? e.message : "Erro"}`);
      }
      await touchMatchUpdatedAt(match.id);
      continue;
    }

    if (!recentData?.data?.length) {
      await touchMatchUpdatedAt(match.id);
      continue;
    }

    const settings: any = match.settings ? JSON.parse(match.settings) : {};
    let details: ValorantMatchDetails | null = null;
    let riotMatchId: string | null = null;

    for (const first of recentData.data) {
      if (!isMatchCompleted(first)) continue;

      const mid = getMatchIdFromMetadata(first);
      if (!mid || settings.riot_match_id === mid) continue;

      await new Promise((r) => setTimeout(r, DELAY_MS));

      let detailsRes: { data?: unknown } | null = null;
      try {
        detailsRes = await getMatchByMatchId("br", mid);
      } catch (e) {
        if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) {
          errors.push(`[${match.matchId}] Rate limit (details)`);
          break;
        }
        continue;
      }

      if (!detailsRes?.data) continue;

      const d = detailsRes.data as ValorantMatchDetails;

      const hubByKey = new Map(
        participants.map((p) => [
          normalizeRiotKey(p.user.riotId!, p.user.tagline!),
          { userId: p.userId, team: normalizeTeam(p.team) },
        ])
      );

      const allPlayers = getAllPlayers(d);

      const riotByKey = new Map(
        allPlayers.map((pl) => [normalizeRiotKey(pl.name ?? "", pl.tag ?? ""), { team: normalizeTeam(pl.team) }])
      );

      const expected = hubByKey.size;
      let matchedPlayers = 0;
      let mismatchedTeams = 0;

      for (const [key, hub] of hubByKey.entries()) {
        const riot = riotByKey.get(key);
        if (!riot) break;
        matchedPlayers++;
        if (hub.team && riot.team && hub.team !== riot.team) mismatchedTeams++;
      }

      if (matchedPlayers < expected || mismatchedTeams > 0) continue;

      details = d;
      riotMatchId = mid;
      break;
    }

    if (!details || !riotMatchId) {
      await touchMatchUpdatedAt(match.id);
      continue;
    }

    const allPlayers = getAllPlayers(details);

    const winnerTeam = computeWinnerTeam(details);
    if (!winnerTeam) {
      await touchMatchUpdatedAt(match.id);
      continue;
    }

    const statsByKey = new Map<string, { kills: number; deaths: number; assists: number; score: number }>();
    for (const pl of allPlayers) {
      const key = normalizeRiotKey(pl.name ?? "", pl.tag ?? "");
      statsByKey.set(key, {
        kills: pl.stats?.kills ?? 0,
        deaths: pl.stats?.deaths ?? 0,
        assists: pl.stats?.assists ?? 0,
        score: pl.stats?.score ?? 0,
      });
    }

    const meta = details.metadata as { game_length_in_ms?: number; game_length?: number } | undefined;
    const durationMs = meta?.game_length_in_ms ?? meta?.game_length ?? 0;
    const matchDurationSec = durationMs > 0 ? Math.round(durationMs / 1000) : null;

    const riotMap = getDetailsMapName(details);

    try {
      await prisma.$transaction(async (tx) => {
        settings.riot_match_id = riotMatchId;

        await tx.gameMatch.update({
          where: { id: match.id },
          data: {
            status: "finished",
            winnerTeam,
            finishedAt: new Date(),
            matchDuration: matchDurationSec,
            ...(riotMap ? { map: riotMap } : {}),
            settings: JSON.stringify(settings),
          },
        });

        const losingTeamUserIds = match.participants.filter((x) => x.team !== winnerTeam).map((x) => x.userId);

        const hasTrollOnLosingTeam = losingTeamUserIds.some((uid) => {
          const found = match.participants.find((x) => x.userId === uid);
          return found?.user?.profileBadge?.toLowerCase() === TROLL_BADGE;
        });

        for (const p of match.participants) {
          const key = p.user.riotId && p.user.tagline ? normalizeRiotKey(p.user.riotId, p.user.tagline) : null;
          const stats = key ? statsByKey.get(key) : null;

          if (stats) {
            await tx.gameMatchUser.updateMany({
              where: { gameMatchId: match.id, userId: p.userId },
              data: { kills: stats.kills, deaths: stats.deaths, assists: stats.assists, score: stats.score },
            });
          }

          const won = p.team === winnerTeam;
          const isTroll = p.user.profileBadge?.toLowerCase() === TROLL_BADGE;

          // ✅ cast firme pra evitar union gigante no TS
          const user = (await tx.user.findUnique({
            where: { id: p.userId },
            select: { elo: true, xp: true, hex: true } as any,
          })) as unknown as UserNums | null;

          if (!user) continue;

          const oldElo = toNum(user.elo, 0);
          const oldXp = toNum(user.xp, 0);
          const oldHex = toNum(user.hex, 0);

          const newElo = won ? Math.min(MAX_ELO, oldElo + ELO_WIN) : Math.max(MIN_ELO, oldElo - ELO_LOSS);

          let hexDelta = 0;
          if (won) hexDelta = HEX_WIN;
          else if (hasTrollOnLosingTeam && isTroll) hexDelta = -HEX_LOSS_TROLL;
          else if (hasTrollOnLosingTeam) hexDelta = -HEX_LOSS_REDUCED;
          else hexDelta = -HEX_LOSS;

          const newHex = Math.max(0, oldHex + hexDelta);

          const xpGain = XP_PER_MATCH_PLAYED + (won ? XP_MATCH_WIN_BONUS : 0);
          const newXp = Math.max(0, oldXp + xpGain);
          const newLevel = levelFromXp(newXp);

          await tx.user.update({
            where: { id: p.userId },
            data: { elo: newElo, xp: newXp, level: newLevel, hex: newHex } as any,
          });
        }
      });

      await invalidateQueueStatusCache();
      updated++;

      for (const p of match.participants) {
        try {
          await verifyAndCompleteMissions(p.userId);
        } catch {
          // ignore
        }
      }
    } catch (e) {
      errors.push(`[${match.matchId}] TX erro: ${e instanceof Error ? e.message : "Erro"}`);
    }
  }

  const endedAt = new Date();
  const result: SyncResult = { checked: pendingMatches.length, updated, errors };

  try {
    await sendDiscordMatchSyncWebhook(result, startedAt, endedAt);
  } catch {
    // ignore
  }

  return result;
}

export type ConcludeResult = { success: true; winnerTeam: string } | { success: false; error: string };

/**
 * Sincroniza uma única partida com a API Riot (perfil do criador → última partida finalizada).
 * Usado pelo criador ("Partida terminou – concluir") e por admin ("Concluir").
 */
export async function syncSingleMatchFromRiot(matchId: string): Promise<ConcludeResult> {
  const match = (await prisma.gameMatch.findUnique({
    where: { matchId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, riotId: true, tagline: true, profileBadge: true } },
        },
      },
    },
  })) as MatchWithParticipants | null;

  if (!match) return { success: false, error: "Partida não encontrada." };
  if (match.status !== "pending" && match.status !== "in_progress") {
    return { success: false, error: "Partida já foi encerrada ou cancelada." };
  }

  const participants = match.participants.filter((p) => p.user.riotId && p.user.tagline);
  if (participants.length === 0) return { success: false, error: "Nenhum participante com Riot vinculado." };

  const creator = participants.find((p) => p.userId === match.creatorId) ?? participants[0];
  const name = creator.user.riotId!.trim();
  const tag = creator.user.tagline!.trim();

  await new Promise((r) => setTimeout(r, DELAY_MS));

  let recentData: { data?: ValorantMatch[] } | null = null;
  try {
    recentData = await getRecentCustomMatches(name, tag, 20);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro na API Riot";
    return { success: false, error: msg.includes("rate") ? "Rate limit da API Riot. Tente em 1 minuto." : msg };
  }

  if (!recentData?.data?.length) {
    return { success: false, error: "Nenhuma partida custom finalizada encontrada no perfil do criador." };
  }

  const settings: any = match.settings ? JSON.parse(match.settings) : {};
  let details: ValorantMatchDetails | null = null;
  let riotMatchId: string | null = null;

  for (const first of recentData.data) {
    if (!isMatchCompleted(first)) continue;

    const mid = getMatchIdFromMetadata(first);
    if (!mid || settings.riot_match_id === mid) continue;

    await new Promise((r) => setTimeout(r, DELAY_MS));

    let detailsRes: { data?: unknown } | null = null;
    try {
      detailsRes = await getMatchByMatchId("br", mid);
    } catch {
      continue;
    }
    if (!detailsRes?.data) continue;

    const d = detailsRes.data as ValorantMatchDetails;

    const hubByKey = new Map(
      participants.map((p) => [
        normalizeRiotKey(p.user.riotId!, p.user.tagline!),
        { userId: p.userId, team: normalizeTeam(p.team) },
      ])
    );

    const allPlayers = getAllPlayers(d);
    const riotByKey = new Map(
      allPlayers.map((pl) => [normalizeRiotKey(pl.name ?? "", pl.tag ?? ""), { team: normalizeTeam(pl.team) }])
    );

    const expected = hubByKey.size;
    let matchedPlayers = 0;
    let mismatchedTeams = 0;

    for (const [key, hub] of hubByKey.entries()) {
      const riot = riotByKey.get(key);
      if (!riot) break;
      matchedPlayers++;
      if (hub.team && riot.team && hub.team !== riot.team) mismatchedTeams++;
    }

    if (matchedPlayers < expected || mismatchedTeams > 0) continue;

    details = d;
    riotMatchId = mid;
    break;
  }

  if (!details || !riotMatchId) {
    return {
      success: false,
      error:
        "Nenhuma partida finalizada no Valorant bateu com esta partida (os 10 jogadores). Confira se a partida já terminou no jogo.",
    };
  }

  const allPlayers = getAllPlayers(details);

  const winnerTeam = computeWinnerTeam(details);
  if (!winnerTeam) {
    return {
      success: false,
      error:
        "Não foi possível definir o time vencedor na partida da Riot (has_won e rounds_won ausentes). Tente novamente em alguns segundos.",
    };
  }

  const statsByKey = new Map<string, { kills: number; deaths: number; assists: number; score: number }>();
  for (const pl of allPlayers) {
    const key = normalizeRiotKey(pl.name ?? "", pl.tag ?? "");
    statsByKey.set(key, {
      kills: pl.stats?.kills ?? 0,
      deaths: pl.stats?.deaths ?? 0,
      assists: pl.stats?.assists ?? 0,
      score: pl.stats?.score ?? 0,
    });
  }

  const meta = details.metadata as { game_length_in_ms?: number; game_length?: number } | undefined;
  const durationMs = meta?.game_length_in_ms ?? meta?.game_length ?? 0;
  const matchDurationSec = durationMs > 0 ? Math.round(durationMs / 1000) : null;

  const riotMap = getDetailsMapName(details);

  try {
    await prisma.$transaction(async (tx) => {
      settings.riot_match_id = riotMatchId;

      await tx.gameMatch.update({
        where: { id: match.id },
        data: {
          status: "finished",
          winnerTeam,
          finishedAt: new Date(),
          matchDuration: matchDurationSec,
          ...(riotMap ? { map: riotMap } : {}),
          settings: JSON.stringify(settings),
        },
      });

      const losingTeamUserIds = match.participants.filter((x) => x.team !== winnerTeam).map((x) => x.userId);

      const hasTrollOnLosingTeam = losingTeamUserIds.some((uid) => {
        const found = match.participants.find((x) => x.userId === uid);
        return found?.user?.profileBadge?.toLowerCase() === TROLL_BADGE;
      });

      for (const p of match.participants) {
        const key = p.user.riotId && p.user.tagline ? normalizeRiotKey(p.user.riotId, p.user.tagline) : null;
        const stats = key ? statsByKey.get(key) : null;

        if (stats) {
          await tx.gameMatchUser.updateMany({
            where: { gameMatchId: match.id, userId: p.userId },
            data: { kills: stats.kills, deaths: stats.deaths, assists: stats.assists, score: stats.score },
          });
        }

        const won = p.team === winnerTeam;
        const isTroll = p.user.profileBadge?.toLowerCase() === TROLL_BADGE;

        // ✅ mesmo cast firme aqui (era isso que tava quebrando nos seus erros)
        const user = (await tx.user.findUnique({
          where: { id: p.userId },
          select: { elo: true, xp: true, hex: true } as any,
        })) as unknown as UserNums | null;

        if (!user) continue;

        const oldElo = toNum(user.elo, 0);
        const oldXp = toNum(user.xp, 0);
        const oldHex = toNum(user.hex, 0);

        const newElo = won ? Math.min(MAX_ELO, oldElo + ELO_WIN) : Math.max(MIN_ELO, oldElo - ELO_LOSS);

        let hexDelta = 0;
        if (won) hexDelta = HEX_WIN;
        else if (hasTrollOnLosingTeam && isTroll) hexDelta = -HEX_LOSS_TROLL;
        else if (hasTrollOnLosingTeam) hexDelta = -HEX_LOSS_REDUCED;
        else hexDelta = -HEX_LOSS;

        const newHex = Math.max(0, oldHex + hexDelta);

        const xpGain = XP_PER_MATCH_PLAYED + (won ? XP_MATCH_WIN_BONUS : 0);
        const newXp = Math.max(0, oldXp + xpGain);
        const newLevel = levelFromXp(newXp);

        await tx.user.update({
          where: { id: p.userId },
          data: { elo: newElo, xp: newXp, level: newLevel, hex: newHex } as any,
        });
      }
    });

    await invalidateQueueStatusCache();

    for (const p of match.participants) {
      try {
        await verifyAndCompleteMissions(p.userId);
      } catch {
        // ignore
      }
    }

    return { success: true, winnerTeam };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro ao salvar no banco." };
  }
}
