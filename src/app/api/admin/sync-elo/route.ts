import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { prisma } from "@/src/lib/prisma";
import { getMMR } from "@/src/lib/valorant";
import { getRankPointsFromTier } from "@/src/lib/rankPoints";

const DELAY_MS = 600;

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
    const errors: { userId: string; reason: string }[] = [];

    for (const u of users) {
      const riotId = u.riotId!.trim();
      const tagline = u.tagline!.trim();
      if (!riotId || !tagline) continue;

      await new Promise((r) => setTimeout(r, DELAY_MS));

      const mmrData = await getMMR(riotId, tagline);
      const currentData = mmrData?.data?.current_data;
      const rankLabel = currentData?.currenttier_patched ?? null;
      const rankPoints = rankLabel != null ? getRankPointsFromTier(rankLabel) : 0;

      try {
        await prisma.user.update({
          where: { id: u.id },
          data: { rank: rankLabel, elo: rankPoints },
        });
        updated++;
      } catch (e) {
        errors.push({
          userId: u.id,
          reason: e instanceof Error ? e.message : "Erro ao atualizar",
        });
      }
    }

    return NextResponse.json({
      message: `ELO/rank atualizados pela API Riot.`,
      totalWithRiot: users.length,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    console.error("admin sync-elo", e);
    return NextResponse.json({ error: "Erro ao sincronizar ELO." }, { status: 500 });
  }
}
