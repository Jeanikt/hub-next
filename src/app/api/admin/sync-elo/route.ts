import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { prisma } from "@/src/lib/prisma";
import { getMMRWithRegionFallback } from "@/src/lib/valorant";
import { getRankPointsFromTier } from "@/src/lib/rankPoints";

const DELAY_MS = 600;

/** Extrai rank (currenttierpatched) da resposta da API Henrik. Trata vazio como Unranked. */
function extractRankFromMMR(mmrData: { data?: { current_data?: { currenttierpatched?: string; elo?: number } } } | null): string | null {
  const label = mmrData?.data?.current_data?.currenttierpatched;
  const s = label != null ? String(label).trim() : "";
  if (s === "" || s.toLowerCase() === "unranked") return "Unranked";
  return s;
}

/** POST /api/admin/sync-elo – atualiza elo e rank de todos os usuários com conta Riot pela API. Apenas admin. */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        riotId: { not: null },
        tagline: { not: null },
      },
      select: { id: true, riotId: true, tagline: true, username: true },
    });

    let updated = 0;
    const errors: { userId: string; username: string | null; reason: string }[] = [];

    for (const u of users) {
      const riotId = u.riotId!.trim();
      const tagline = u.tagline!.trim();
      if (!riotId || !tagline) continue;

      await new Promise((r) => setTimeout(r, DELAY_MS));

      const mmrData = await getMMRWithRegionFallback(riotId, tagline);
      const rankLabel = extractRankFromMMR(mmrData);
      const rankPoints = rankLabel != null ? getRankPointsFromTier(rankLabel) : 0;

      try {
        await prisma.$executeRaw`UPDATE users SET rank = ${rankLabel}, elo = ${rankPoints} WHERE id = ${u.id}`;
        updated++;
      } catch (e) {
        const reason = e instanceof Error ? e.message : "Erro ao atualizar";
        errors.push({ userId: u.id, username: u.username, reason });
      }
    }

    return NextResponse.json({
      message: `ELO/rank atualizados pela API Riot.`,
      totalWithRiot: users.length,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao sincronizar ELO." }, { status: 500 });
  }
}
