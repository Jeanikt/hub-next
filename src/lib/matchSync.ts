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

const HEX_WIN = 25;
const HEX_LOSS = 20;
const HEX_LOSS_REDUCED = 10;
const HEX_LOSS_TROLL = 60;

const XP_PER_MATCH_PLAYED = 10;
const XP_MATCH_WIN_BONUS = 5;
const TROLL_BADGE = "troll";

const MATCH_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4h
const LAST_SYNC_CHECK_MS = 1 * 60 * 1000; // 1min
const DELAY_MS = 3000; // 3s

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

type UserNums = { elo: number | null; xp: number | null; hex: number | null };

export type SyncResult = {
  checked: number;
  updated: number;
  errors: string[];
  debug?: string[]; // ⬅️ novo: devolve detalhes no response, se quiser
};

function normalizeRiotKey(name: string, tag: string): string {
  return `${String(name || "").trim().toLowerCase()}#${String(tag || "").trim().toLowerCase()}`;
}

/** Normalização mais agressiva para matching: remove acentos e caracteres extras (API pode vir diferente). */
function normalizeRiotKeyRelaxed(name: string, tag: string): string {
  const n = String(name ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mc}/gu, "")
    .replace(/\p{Mn}/gu, "");
  const t = String(tag ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mc}/gu, "")
    .replace(/\p{Mn}/gu, "");
  return `${n}#${t}`;
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
      const id = String(t.team_id ?? "").trim().toLowerCase();
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

  const meta = details?.metadata as { round_win_team?: string; winning_team?: string } | undefined;
  const winTeam = (meta?.round_win_team ?? meta?.winning_team ?? "").trim().toLowerCase();
  if (winTeam === "red") return "red";
  if (winTeam === "blue") return "blue";

  const allPlayers = getAllPlayers(details);
  let redWins = 0;
  let blueWins = 0;
  for (const pl of allPlayers) {
    const team = getPlayerTeam(pl);
    const won = (pl as { has_won?: boolean }).has_won === true;
    if (won && team === "red") redWins++;
    if (won && team === "blue") blueWins++;
  }
  if (redWins > blueWins) return "red";
  if (blueWins > redWins) return "blue";

  return null;
}

function getAllPlayers(details: ValorantMatchDetails) {
  const playersRaw = details.players as
    | { all_players?: unknown[]; red?: unknown[]; blue?: unknown[] }
    | unknown[]
    | undefined;
  if (Array.isArray(playersRaw)) {
    return playersRaw as Array<{ name?: string; tag?: string; team?: string; team_id?: string; stats?: { kills?: number; deaths?: number; assists?: number; score?: number } }>;
  }
  const all = playersRaw?.all_players ?? [];
  const redList = (playersRaw as { red?: unknown[] })?.red ?? [];
  const blueList = (playersRaw as { blue?: unknown[] })?.blue ?? [];
  const merged =
    all.length > 0
      ? all
      : [
          ...redList.map((pl) => (typeof pl === "object" && pl && !("team" in pl) ? { ...pl, team: "red" } : pl)),
          ...blueList.map((pl) => (typeof pl === "object" && pl && !("team" in pl) ? { ...pl, team: "blue" } : pl)),
        ];
  return merged as Array<{
    name?: string;
    tag?: string;
    team?: string;
    team_id?: string;
    stats?: { kills?: number; deaths?: number; assists?: number; score?: number };
  }>;
}

function getPlayerTeam(pl: { team?: string; team_id?: string }): "red" | "blue" | null {
  // alguns providers usam team, outros team_id
  return normalizeTeam(pl.team ?? pl.team_id);
}

async function touchMatchUpdatedAt(matchDbId: number) {
  try {
    const current = await prisma.gameMatch.findUnique({
      where: { id: matchDbId },
      select: { settings: true },
    });
    await prisma.gameMatch.update({
      where: { id: matchDbId },
      data: { settings: current?.settings ?? null },
    });
  } catch {
    // ignore
  }
}

async function sendDiscordMatchSyncWebhook(result: SyncResult, startedAt: Date, endedAt: Date) {
  const url = process.env.DISCORD_MATCH_SYNC_WEBHOOK;
  if (!url) return;

  const color = result.errors.length > 0 ? 0xff5c5c : 0x57f287;
  const notFinished = Math.max(0, result.checked - result.updated);
  const maxErrorsShown = 12;

  const errorsPreview =
    result.errors.length > 0
      ? result.errors.slice(0, maxErrorsShown).join("\n") +
        (result.errors.length > maxErrorsShown ? `\n...(+${result.errors.length - maxErrorsShown} mais)` : "")
      : "Nenhum";

  const debugPreview =
    (result.debug?.length ?? 0) > 0
      ? result.debug!.slice(0, maxErrorsShown).join("\n") +
        (result.debug!.length > maxErrorsShown ? `\n...(+${result.debug!.length - maxErrorsShown} mais)` : "")
      : "—";

  const embed = {
    title: "Cron: Sincronização de partidas",
    description: "Execução da verificação/sincronização",
    color,
    fields: [
      { name: "Partidas verificadas", value: String(result.checked), inline: true },
      { name: "Partidas sincronizadas", value: String(result.updated), inline: true },
      { name: "Partidas não sincronizadas", value: String(notFinished), inline: true },
      { name: "Erros", value: errorsPreview.slice(0, 1024) || "Nenhum", inline: false },
      { name: "Debug (motivos)", value: debugPreview.slice(0, 1024) || "—", inline: false },
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

// ⬇️ helper que retorna um relatório claro do “db vs riot”
function compareDbVsRiot(
  match: MatchWithParticipants,
  details: ValorantMatchDetails
): {
  ok: boolean;
  mapDb: string | null;
  mapRiot: string | null;
  expectedPlayers: number;
  matchedPlayers: number;
  missingPlayers: string[];
  teamMismatches: string[];
} {
  const participants = match.participants.filter((p) => p.user.riotId && p.user.tagline);

  const hubByKey = new Map(
    participants.map((p) => [
      normalizeRiotKey(p.user.riotId!, p.user.tagline!),
      { userId: p.userId, team: normalizeTeam(p.team), keyRelaxed: normalizeRiotKeyRelaxed(p.user.riotId!, p.user.tagline!) },
    ])
  );

  const allPlayers = getAllPlayers(details);
  const riotByKey = new Map<string, { team: "red" | "blue" | null }>();
  for (const pl of allPlayers) {
    const key = normalizeRiotKey(pl.name ?? "", pl.tag ?? "");
    const keyRelaxed = normalizeRiotKeyRelaxed(pl.name ?? "", pl.tag ?? "");
    const entry = { team: getPlayerTeam(pl) };
    riotByKey.set(key, entry);
    if (keyRelaxed !== key) riotByKey.set(keyRelaxed, entry);
  }

  const missingPlayers: string[] = [];
  const teamMismatches: string[] = [];
  let matchedPlayers = 0;

  for (const [key, hub] of hubByKey.entries()) {
    const riot = riotByKey.get(key) ?? riotByKey.get(hub.keyRelaxed);
    if (!riot) {
      missingPlayers.push(key);
      continue;
    }
    matchedPlayers++;

    if (hub.team && riot.team && hub.team !== riot.team) {
      teamMismatches.push(`${key}: db=${hub.team} riot=${riot.team}`);
    }
  }

  const mapDb = match.map ?? null;
  const mapRiot = getDetailsMapName(details);

  const expectedPlayers = hubByKey.size;
  const ok = missingPlayers.length === 0 && teamMismatches.length === 0;

  return { ok, mapDb, mapRiot, expectedPlayers, matchedPlayers, missingPlayers, teamMismatches };
}

export async function syncPendingMatchesFromRiot(): Promise<SyncResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  const debug: string[] = [];
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
      debug.push(`[${match.matchId}] skip: ninguém com riotId/tagline vinculado`);
      await touchMatchUpdatedAt(match.id);
      continue;
    }

    const creator = participants.find((p) => p.userId === match.creatorId) ?? participants[0];
    const toTry = [creator, ...participants.filter((p) => p.userId !== creator.userId)].slice(0, 3);

    const seenMatchIds = new Set<string>();
    const recentMatches: ValorantMatch[] = [];

    for (const participant of toTry) {
      const name = participant.user.riotId!.trim();
      const tag = participant.user.tagline!.trim();
      await new Promise((r) => setTimeout(r, DELAY_MS));
      let data: { data?: ValorantMatch[] } | null = null;
      try {
        data = await getRecentCustomMatches(name, tag, 30);
      } catch (e) {
        if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) {
          errors.push(`[${match.matchId}] rate limit (recentCustoms)`);
          break;
        }
        continue;
      }
      if (!data?.data?.length) continue;
      for (const m of data.data) {
        const mid = getMatchIdFromMetadata(m);
        if (mid && !seenMatchIds.has(mid)) {
          seenMatchIds.add(mid);
          recentMatches.push(m);
        }
      }
    }

    if (recentMatches.length === 0) {
      debug.push(`[${match.matchId}] skip: perfil do(s) participante(s) sem customs recentes`);
      await touchMatchUpdatedAt(match.id);
      continue;
    }

    const settings: any = match.settings ? JSON.parse(match.settings) : {};
    let pickedDetails: ValorantMatchDetails | null = null;
    let pickedRiotMatchId: string | null = null;

    const tried: string[] = [];

    for (const first of recentMatches) {
      if (!isMatchCompleted(first)) continue;

      const mid = getMatchIdFromMetadata(first);
      if (!mid) continue;
      if (settings.riot_match_id === mid) {
        tried.push(`${mid}: skip (já sincronizada antes)`);
        continue;
      }

      await new Promise((r) => setTimeout(r, DELAY_MS));

      let detailsRes: { data?: unknown } | null = null;
      try {
        detailsRes = await getMatchByMatchId("br", mid);
      } catch (e) {
        if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) {
          errors.push(`[${match.matchId}] rate limit (details)`);
          tried.push(`${mid}: rate limit`);
          break;
        }
        tried.push(`${mid}: erro details`);
        continue;
      }

      if (!detailsRes?.data) {
        tried.push(`${mid}: details vazio`);
        continue;
      }

      const d = detailsRes.data as ValorantMatchDetails;
      const comp = compareDbVsRiot(match, d);

      const mapNote =
        comp.mapDb || comp.mapRiot
          ? `map db=${comp.mapDb ?? "—"} riot=${comp.mapRiot ?? "—"}`
          : "map —";

      if (!comp.ok) {
        const miss = comp.missingPlayers.length ? `missing=${comp.missingPlayers.length}` : "missing=0";
        const tm = comp.teamMismatches.length ? `teamMismatch=${comp.teamMismatches.length}` : "teamMismatch=0";
        tried.push(`${mid}: NÃO bate (${miss}, ${tm}, ${mapNote})`);
        continue;
      }

      // ✅ bateu jogadores/time, escolhe esse
      pickedDetails = d;
      pickedRiotMatchId = mid;
      tried.push(`${mid}: OK (${mapNote})`);
      break;
    }

    if (!pickedDetails || !pickedRiotMatchId) {
      debug.push(
        `[${match.matchId}] não achou match riot. tentativas: ${tried.slice(0, 4).join(" | ")}${
          tried.length > 4 ? " | ..." : ""
        }`
      );
      await touchMatchUpdatedAt(match.id);
      continue;
    }

    const winnerTeam = computeWinnerTeam(pickedDetails);
    if (!winnerTeam) {
      debug.push(`[${match.matchId}] achou riotMatchId=${pickedRiotMatchId}, mas winnerTeam não deu pra calcular`);
      await touchMatchUpdatedAt(match.id);
      continue;
    }

    const compFinal = compareDbVsRiot(match, pickedDetails);
    debug.push(
      `[${match.matchId}] candidato OK riotMatchId=${pickedRiotMatchId} | players ${compFinal.matchedPlayers}/${compFinal.expectedPlayers} | map db=${compFinal.mapDb ?? "—"} riot=${compFinal.mapRiot ?? "—"} | winner=${winnerTeam}`
    );

    const allPlayers = getAllPlayers(pickedDetails);

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

    const meta = pickedDetails.metadata as { game_length_in_ms?: number; game_length?: number } | undefined;
    const durationMs = meta?.game_length_in_ms ?? meta?.game_length ?? 0;
    const matchDurationSec = durationMs > 0 ? Math.round(durationMs / 1000) : null;

    const riotMap = getDetailsMapName(pickedDetails);

    try {
      await prisma.$transaction(async (tx) => {
        settings.riot_match_id = pickedRiotMatchId;

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

        const losingTeamUserIds = match.participants
          .filter((x) => x.team !== winnerTeam)
          .map((x) => x.userId);

        const hasTrollOnLosingTeam = losingTeamUserIds.some((uid) => {
          const found = match.participants.find((x) => x.userId === uid);
          return found?.user?.profileBadge?.toLowerCase() === TROLL_BADGE;
        });

        for (const p of match.participants) {
          const key =
            p.user.riotId && p.user.tagline ? normalizeRiotKey(p.user.riotId, p.user.tagline) : null;

          const stats = key ? statsByKey.get(key) : null;
          if (stats) {
            await tx.gameMatchUser.updateMany({
              where: { gameMatchId: match.id, userId: p.userId },
              data: {
                kills: stats.kills,
                deaths: stats.deaths,
                assists: stats.assists,
                score: stats.score,
              },
            });
          } else {
            debug.push(
              `[${match.matchId}] stats faltando para userId=${p.userId} (${p.user.riotId ?? "—"}#${p.user.tagline ?? "—"})`
            );
          }

          const won = p.team === winnerTeam;
          const isTroll = p.user.profileBadge?.toLowerCase() === TROLL_BADGE;

          const user = (await tx.user.findUnique({
            where: { id: p.userId },
            select: { elo: true, xp: true, hex: true } as any,
          })) as unknown as UserNums | null;

          if (user) {
            let newElo = user.elo ?? 0;
            if (won) newElo = Math.min(MAX_ELO, newElo + ELO_WIN);
            else newElo = Math.max(MIN_ELO, newElo - ELO_LOSS);

            let hexDelta = 0;
            if (won) hexDelta = HEX_WIN;
            else if (hasTrollOnLosingTeam && isTroll) hexDelta = -HEX_LOSS_TROLL;
            else if (hasTrollOnLosingTeam) hexDelta = -HEX_LOSS_REDUCED;
            else hexDelta = -HEX_LOSS;

            const newHex = Math.max(0, (user.hex ?? 0) + hexDelta);

            const xpGain = XP_PER_MATCH_PLAYED + (won ? XP_MATCH_WIN_BONUS : 0);
            const newXp = Math.max(0, (user.xp ?? 0) + xpGain);
            const newLevel = levelFromXp(newXp);

            await tx.user.update({
              where: { id: p.userId },
              data: { elo: newElo, xp: newXp, level: newLevel, hex: newHex } as any,
            });
          } else {
            debug.push(`[${match.matchId}] user não encontrado no banco: userId=${p.userId}`);
          }
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
  const result: SyncResult = { checked: pendingMatches.length, updated, errors, debug };

  await sendDiscordMatchSyncWebhook(result, startedAt, endedAt);

  return result;
}

export type ConcludeResult =
  | { success: true; winnerTeam: "red" | "blue"; riotMatchId: string; debug?: string[] }
  | { success: false; error: string; debug?: string[] };

/**
 * Sincroniza uma única partida com a API Riot (perfil do criador → última partida finalizada compatível).
 * Usado pelo criador ("Partida terminou – concluir") e por admin ("Concluir").
 *
 * Mantive a lógica igual da syncPendingMatchesFromRiot:
 * - pega recentes do criador
 * - testa cada match finalizado
 * - busca details
 * - valida players/times com compareDbVsRiot
 * - aplica update no banco
 */
export async function syncSingleMatchFromRiot(matchId: string): Promise<ConcludeResult> {
  const debug: string[] = [];

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

  if (!match) return { success: false, error: "Partida não encontrada.", debug: [`[${matchId}] não encontrada`] };
  if (match.status !== "pending" && match.status !== "in_progress") {
    return { success: false, error: "Partida já foi encerrada ou cancelada.", debug: [`[${matchId}] status=${match.status}`] };
  }

  const participants = match.participants.filter((p) => p.user.riotId && p.user.tagline);
  if (participants.length === 0) {
    return { success: false, error: "Nenhum participante com Riot vinculado.", debug: [`[${matchId}] sem riotId/tagline`] };
  }

  const creator = participants.find((p) => p.userId === match.creatorId) ?? participants[0];
  const toTry = [creator, ...participants.filter((p) => p.userId !== creator.userId)].slice(0, 3);

  const seenMatchIds = new Set<string>();
  const recentMatches: ValorantMatch[] = [];

  for (const participant of toTry) {
    const name = participant.user.riotId!.trim();
    const tag = participant.user.tagline!.trim();
    await new Promise((r) => setTimeout(r, DELAY_MS));
    let data: { data?: ValorantMatch[] } | null = null;
    try {
      data = await getRecentCustomMatches(name, tag, 30);
    } catch (e) {
      if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) {
        return { success: false, error: "Rate limit da API Riot. Tente em 1 minuto.", debug: [`[${matchId}] rate limit`] };
      }
      continue;
    }
    if (!data?.data?.length) continue;
    for (const m of data.data) {
      const mid = getMatchIdFromMetadata(m);
      if (mid && !seenMatchIds.has(mid)) {
        seenMatchIds.add(mid);
        recentMatches.push(m);
      }
    }
  }

  if (recentMatches.length === 0) {
    return {
      success: false,
      error: "Nenhuma partida custom finalizada encontrada nos perfis dos participantes.",
      debug: [`[${matchId}] sem customs recentes`],
    };
  }

  const settings: any = match.settings ? JSON.parse(match.settings) : {};
  let pickedDetails: ValorantMatchDetails | null = null;
  let pickedRiotMatchId: string | null = null;

  const tried: string[] = [];

  for (const first of recentMatches) {
    if (!isMatchCompleted(first)) continue;

    const mid = getMatchIdFromMetadata(first);
    if (!mid) continue;
    if (settings.riot_match_id === mid) {
      tried.push(`${mid}: skip (já sincronizada antes)`);
      continue;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));

    let detailsRes: { data?: unknown } | null = null;
    try {
      detailsRes = await getMatchByMatchId("br", mid);
    } catch (e) {
      if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) {
        return { success: false, error: "Rate limit da API Riot (details). Tente em 1 minuto.", debug: [...debug, ...tried, `${mid}: rate limit`] };
      }
      tried.push(`${mid}: erro details`);
      continue;
    }

    if (!detailsRes?.data) {
      tried.push(`${mid}: details vazio`);
      continue;
    }

    const d = detailsRes.data as ValorantMatchDetails;
    const comp = compareDbVsRiot(match, d);

    const mapNote =
      comp.mapDb || comp.mapRiot ? `map db=${comp.mapDb ?? "—"} riot=${comp.mapRiot ?? "—"}` : "map —";

    if (!comp.ok) {
      const miss = comp.missingPlayers.length ? `missing=${comp.missingPlayers.length}` : "missing=0";
      const tm = comp.teamMismatches.length ? `teamMismatch=${comp.teamMismatches.length}` : "teamMismatch=0";
      tried.push(`${mid}: NÃO bate (${miss}, ${tm}, ${mapNote})`);
      continue;
    }

    pickedDetails = d;
    pickedRiotMatchId = mid;
    tried.push(`${mid}: OK (${mapNote})`);
    break;
  }

  if (!pickedDetails || !pickedRiotMatchId) {
    return {
      success: false,
      error: "Nenhuma partida finalizada no Valorant bateu com esta partida (jogadores/times).",
      debug: [`[${matchId}] não achou match riot. tentativas: ${tried.slice(0, 6).join(" | ")}${tried.length > 6 ? " | ..." : ""}`],
    };
  }

  const winnerTeam = computeWinnerTeam(pickedDetails);
  if (!winnerTeam) {
    return {
      success: false,
      error: "Não foi possível definir o time vencedor na partida da Riot (has_won e rounds_won ausentes).",
      debug: [`[${matchId}] riotMatchId=${pickedRiotMatchId} sem winnerTeam`],
    };
  }

  const compFinal = compareDbVsRiot(match, pickedDetails);
  debug.push(
    `[${match.matchId}] candidato OK riotMatchId=${pickedRiotMatchId} | players ${compFinal.matchedPlayers}/${compFinal.expectedPlayers} | map db=${compFinal.mapDb ?? "—"} riot=${compFinal.mapRiot ?? "—"} | winner=${winnerTeam}`
  );

  const allPlayers = getAllPlayers(pickedDetails);

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

  const meta = pickedDetails.metadata as { game_length_in_ms?: number; game_length?: number } | undefined;
  const durationMs = meta?.game_length_in_ms ?? meta?.game_length ?? 0;
  const matchDurationSec = durationMs > 0 ? Math.round(durationMs / 1000) : null;

  const riotMap = getDetailsMapName(pickedDetails);

  try {
    await prisma.$transaction(async (tx) => {
      settings.riot_match_id = pickedRiotMatchId;

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

      const losingTeamUserIds = match.participants
        .filter((x) => x.team !== winnerTeam)
        .map((x) => x.userId);

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
        } else {
          debug.push(`[${match.matchId}] stats faltando para userId=${p.userId} (${p.user.riotId ?? "—"}#${p.user.tagline ?? "—"})`);
        }

        const won = p.team === winnerTeam;
        const isTroll = p.user.profileBadge?.toLowerCase() === TROLL_BADGE;

        const user = (await tx.user.findUnique({
          where: { id: p.userId },
          select: { elo: true, xp: true, hex: true } as any,
        })) as unknown as UserNums | null;

        if (user) {
          let newElo = user.elo ?? 0;
          if (won) newElo = Math.min(MAX_ELO, newElo + ELO_WIN);
          else newElo = Math.max(MIN_ELO, newElo - ELO_LOSS);

          let hexDelta = 0;
          if (won) hexDelta = HEX_WIN;
          else if (hasTrollOnLosingTeam && isTroll) hexDelta = -HEX_LOSS_TROLL;
          else if (hasTrollOnLosingTeam) hexDelta = -HEX_LOSS_REDUCED;
          else hexDelta = -HEX_LOSS;

          const newHex = Math.max(0, (user.hex ?? 0) + hexDelta);

          const xpGain = XP_PER_MATCH_PLAYED + (won ? XP_MATCH_WIN_BONUS : 0);
          const newXp = Math.max(0, (user.xp ?? 0) + xpGain);
          const newLevel = levelFromXp(newXp);

          await tx.user.update({
            where: { id: p.userId },
            data: { elo: newElo, xp: newXp, level: newLevel, hex: newHex } as any,
          });
        } else {
          debug.push(`[${match.matchId}] user não encontrado no banco: userId=${p.userId}`);
        }
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

    return { success: true, winnerTeam, riotMatchId: pickedRiotMatchId, debug };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro ao salvar no banco.", debug };
  }
}
