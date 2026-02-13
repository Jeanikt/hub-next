import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { invalidateQueueStatusCache } from "@/src/lib/redis";

/** PATCH /api/admin/matches/[id] – cancelar ou reiniciar partida. Body: { action: "cancel" | "restart" } */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    const { id } = await params;
    const matchId = parseInt(id, 10);
    if (Number.isNaN(matchId)) {
      return NextResponse.json({ message: "ID inválido." }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const action = body.action as string;

    const match = await prisma.gameMatch.findUnique({
      where: { id: matchId },
      select: { id: true, status: true, matchId: true },
    });
    if (!match) {
      return NextResponse.json({ message: "Partida não encontrada." }, { status: 404 });
    }

    if (action === "cancel") {
      await prisma.gameMatch.update({
        where: { id: matchId },
        data: { status: "cancelled", finishedAt: new Date() },
      });
      await invalidateQueueStatusCache();
      return NextResponse.json({
        message: "Partida cancelada.",
        matchId: match.matchId,
        status: "cancelled",
      });
    }

    if (action === "restart") {
      await prisma.gameMatch.update({
        where: { id: matchId },
        data: {
          status: "pending",
          startedAt: null,
          finishedAt: null,
          winnerTeam: null,
          matchDuration: null,
        },
      });
      await invalidateQueueStatusCache();
      return NextResponse.json({
        message: "Partida reiniciada (pendente).",
        matchId: match.matchId,
        status: "pending",
      });
    }

    return NextResponse.json(
      { message: "action deve ser: cancel ou restart." },
      { status: 422 }
    );
  } catch (e) {
    console.error("admin matches PATCH", e);
    return NextResponse.json({ error: "Erro ao atualizar partida." }, { status: 500 });
  }
}
