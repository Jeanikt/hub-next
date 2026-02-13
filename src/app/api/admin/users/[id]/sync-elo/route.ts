import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { prisma } from "@/src/lib/prisma";
import { getMMRWithRegionFallback, getRankLabelFromMMR, VALORANT_RATE_LIMIT_ERROR } from "@/src/lib/valorant";
import { getRankPointsFromTier } from "@/src/lib/rankPoints";

/** POST /api/admin/users/[id]/sync-elo – sincroniza ELO/rank de um usuário pela API Riot. Apenas admin. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    const { id: userId } = await params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, riotId: true, tagline: true, username: true },
    });
    if (!user) {
      return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
    }
    const riotId = user.riotId?.trim();
    const tagline = user.tagline?.trim();
    if (!riotId || !tagline) {
      return NextResponse.json(
        { message: "Usuário não possui conta Riot vinculada." },
        { status: 400 }
      );
    }
    const mmrData = await getMMRWithRegionFallback(riotId, tagline);
    const rankLabel = getRankLabelFromMMR(mmrData);
    const rankPoints = rankLabel != null ? getRankPointsFromTier(rankLabel) : 0;
    await prisma.user.update({
      where: { id: userId },
      data: { rank: rankLabel, elo: rankPoints },
    });
    return NextResponse.json({
      ok: true,
      rank: rankLabel,
      elo: rankPoints,
    });
  } catch (e) {
    if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) {
      return NextResponse.json(
        { message: "Muitos acessos à API Riot. Tente em 1 minuto." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Erro ao sincronizar ELO." }, { status: 500 });
  }
}
