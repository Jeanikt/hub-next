/**
 * Sincroniza partidas pendentes do Hub com partidas encerradas no Valorant (API Henrik).
 * Usado pelo cron /api/cron/check-matches.
 */
import { prisma } from "@/src/lib/prisma";
import { getLastCustomMatchFresh, getMatchByMatchId, VALORANT_RATE_LIMIT_ERROR, type ValorantMatch, type ValorantMatchDetails } from "@/src/lib/valorant";
import { invalidateQueueStatusCache } from "@/src/lib/redis";
import { verifyAndCompleteMissions } from "@/src/lib/missions/verify";

const MIN_ELO = 0;
const MAX_ELO = 20;
const ELO_WIN = 1;
const ELO_LOSS = 1;
const MATCH_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4h
const DELAY_MS = 800;

function normalizeRiotKey(name: string, tag: string): string {
  return `${String(name || "").trim().toLowerCase()}#${String(tag || "").trim().toLowerCase()}`;
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

function extractFirstMatch(data: ValorantMatch | ValorantMatch[] | undefined): ValorantMatch | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data as ValorantMatch;
}

export type SyncResult = {
  checked: number;
  updated: number;
  errors: string[];
};

export async function syncPendingMatchesFromRiot(): Promise<SyncResult> {
  const errors: string[] = [];
  let updated = 0;

  const cutoff = new Date(Date.now() - MATCH_MAX_AGE_MS);
  const pendingMatches = await prisma.gameMatch.findMany({
    where: {
      status: { in: ["pending", "in_progress"] },
      createdAt: { gte: cutoff },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, riotId: true, tagline: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  for (const match of pendingMatches) {
    const participants = match.participants.filter(
      (p) => p.user.riotId && p.user.tagline
    );
    if (participants.length === 0) continue;

    const creator = participants.find((p) => p.userId === match.creatorId) ?? participants[0];
    const name = creator.user.riotId!.trim();
    const tag = creator.user.tagline!.trim();

    await new Promise((r) => setTimeout(r, DELAY_MS));
    let lastCustom;
    try {
      lastCustom = await getLastCustomMatchFresh(name, tag);
    } catch (e) {
      if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) {
        errors.push("Rate limit da API Riot");
      }
      continue;
    }
    if (!lastCustom || "error" in lastCustom) continue;

    const first = extractFirstMatch(lastCustom.data);
    if (!first) continue;
    if (!isMatchCompleted(first)) continue;

    const riotMatchId = getMatchIdFromMetadata(first);
    if (!riotMatchId) continue;

    const settings = match.settings ? JSON.parse(match.settings) : {};
    if (settings.riot_match_id === riotMatchId) continue;

    await new Promise((r) => setTimeout(r, DELAY_MS));
    let detailsRes;
    try {
      detailsRes = await getMatchByMatchId("br", riotMatchId);
    } catch (e) {
      if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) {
        errors.push("Rate limit da API Riot");
      }
      continue;
    }
    if (!detailsRes?.data) continue;
    const details = detailsRes.data as ValorantMatchDetails;

    const teams = details.teams as
      | { red?: { has_won?: boolean }; blue?: { has_won?: boolean } }
      | Array<{ team_id?: string; has_won?: boolean }>
      | undefined;
    let redWon = false;
    let blueWon = false;
    if (teams && !Array.isArray(teams)) {
      redWon = (teams as { red?: { has_won?: boolean } }).red?.has_won === true;
      blueWon = (teams as { blue?: { has_won?: boolean } }).blue?.has_won === true;
    } else if (Array.isArray(teams)) {
      for (const t of teams) {
        const id = String(t.team_id ?? "").toLowerCase();
        if (id === "red" && (t as { has_won?: boolean }).has_won) redWon = true;
        if (id === "blue" && (t as { has_won?: boolean }).has_won) blueWon = true;
      }
    }
    const winnerTeam = redWon ? "red" : blueWon ? "blue" : null;
    if (!winnerTeam) continue;

    const hubRiotKeys = new Map(
      participants.map((p) => [
        normalizeRiotKey(p.user.riotId!, p.user.tagline!),
        p,
      ])
    );

    const playersRaw = details.players as { all_players?: unknown[] } | unknown[] | undefined;
    const allPlayers = Array.isArray(playersRaw)
      ? playersRaw
      : (playersRaw?.all_players ?? []);
    const statsByKey = new Map<string, { kills: number; deaths: number; assists: number; score: number }>();
    for (const pl of allPlayers) {
      const p = pl as { name?: string; tag?: string; stats?: { kills?: number; deaths?: number; assists?: number; score?: number } };
      const key = normalizeRiotKey(p.name ?? "", p.tag ?? "");
      statsByKey.set(key, {
        kills: p.stats?.kills ?? 0,
        deaths: p.stats?.deaths ?? 0,
        assists: p.stats?.assists ?? 0,
        score: p.stats?.score ?? 0,
      });
    }

    const metadata = details.metadata as { game_length_in_ms?: number; game_length?: number } | undefined;
    const durationMs = metadata?.game_length_in_ms ?? metadata?.game_length ?? 0;
    const matchDurationSec = durationMs > 0 ? Math.round(durationMs / 1000) : null;

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
            settings: JSON.stringify(settings),
          },
        });

        for (const p of match.participants) {
          const key = p.user.riotId && p.user.tagline
            ? normalizeRiotKey(p.user.riotId, p.user.tagline)
            : null;
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
          }

          const won = p.team === winnerTeam;
          const user = await tx.user.findUnique({
            where: { id: p.userId },
            select: { elo: true },
          });
          if (user) {
            let newElo = user.elo ?? 0;
            if (won) newElo = Math.min(MAX_ELO, newElo + ELO_WIN);
            else newElo = Math.max(MIN_ELO, newElo - ELO_LOSS);
            await tx.user.update({
              where: { id: p.userId },
              data: { elo: newElo },
            });
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
      errors.push(`${match.matchId}: ${e instanceof Error ? e.message : "Erro"}`);
    }
  }

  return { checked: pendingMatches.length, updated, errors };
}
