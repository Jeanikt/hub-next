/**
 * Lógica compartilhada de sincronização de ELO (admin e cron).
 * Atualiza rank e elo de todos os usuários com conta Riot via API Henrik.
 */
import { prisma } from "@/src/lib/prisma";
import { getMMRWithRegionFallback, getRankLabelFromMMR, VALORANT_RATE_LIMIT_ERROR } from "@/src/lib/valorant";
import { getRankPointsFromTier } from "@/src/lib/rankPoints";

/** Delay entre usuários para não estourar rate limit (já temos 28/min no módulo valorant). */
const DELAY_MS = 2500;

export type SyncEloResult = {
  totalWithRiot: number;
  updated: number;
  errors: { userId: string; username: string | null; reason: string }[];
};

export async function runSyncElo(): Promise<SyncEloResult> {
  const users = await prisma.user.findMany({
    where: { riotId: { not: null }, tagline: { not: null } },
    select: { id: true, riotId: true, tagline: true, username: true },
  });

  const errors: { userId: string; username: string | null; reason: string }[] = [];
  let updated = 0;

  for (const u of users) {
    const riotId = u.riotId!.trim();
    const tagline = u.tagline!.trim();
    if (!riotId || !tagline) continue;

    await new Promise((r) => setTimeout(r, DELAY_MS));

    let mmrData;
    try {
      mmrData = await getMMRWithRegionFallback(riotId, tagline);
    } catch (e) {
      const reason = e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR
        ? "Rate limit da API Riot"
        : (e instanceof Error ? e.message : "Erro ao buscar MMR");
      errors.push({ userId: u.id, username: u.username, reason });
      continue;
    }

    const rankLabel = getRankLabelFromMMR(mmrData);
    const rankPoints = rankLabel != null ? getRankPointsFromTier(rankLabel) : 0;

    try {
      await prisma.$executeRaw`UPDATE users SET rank = ${rankLabel}, elo = ${rankPoints} WHERE id = ${u.id}`;
      updated++;
    } catch (e) {
      errors.push({
        userId: u.id,
        username: u.username,
        reason: e instanceof Error ? e.message : "Erro ao atualizar",
      });
    }
  }

  return { totalWithRiot: users.length, updated, errors };
}
