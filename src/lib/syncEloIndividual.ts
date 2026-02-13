import { prisma } from "@/src/lib/prisma";
import { getMMRWithRegionFallback, getRankLabelFromMMR, VALORANT_RATE_LIMIT_ERROR } from "@/src/lib/valorant";
import { getRankPointsFromTier } from "./rankPoints";


export type SyncOneEloResult =
  | { ok: true; rank: string | null; elo: number }
  | { ok: false; reason: string };

export async function syncEloForUser(riotId: string, tagline: string, userId: string): Promise<SyncOneEloResult> {
  const name = riotId.trim();
  const tag = tagline.trim();
  if (!name || !tag) return { ok: false, reason: "riot_id_or_tag_empty" };


  let mmrData;
  try {
    mmrData = await getMMRWithRegionFallback(name, tag);
  } catch (e) {
    const reason =
      e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR
        ? "many_requests"
        : (e instanceof Error ? e.message : "mmr_fetch_error");
    return { ok: false, reason };
  }

  const rankLabel = getRankLabelFromMMR(mmrData);
  const rankPoints = rankLabel != null ? getRankPointsFromTier(rankLabel) : 0;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { rank: rankLabel, elo: rankPoints },
    });
    return { ok: true, rank: rankLabel, elo: rankPoints };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "db_update_error" };
  }
}
