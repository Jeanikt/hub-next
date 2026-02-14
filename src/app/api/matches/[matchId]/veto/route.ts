import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { serverError } from "@/src/lib/serverLog";
import { invalidateQueueStatusCache } from "@/src/lib/redis";

type Params = { params: Promise<{ matchId: string }> };

/** Maioria necessária para cancelar por veto (ex.: 6 de 10, 2 de 2). */
function vetoThreshold(maxPlayers: number): number {
  return Math.floor(maxPlayers / 2) + 1;
}

/** POST /api/matches/[matchId]/veto – participante vota para cancelar a partida. Se maioria votar, a partida é cancelada. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const { matchId } = await params;

    const match = await prisma.gameMatch.findUnique({
      where: { matchId },
      include: {
        participants: { select: { userId: true } },
        cancelVotes: { select: { userId: true } },
      },
    });

    if (!match) {
      return NextResponse.json({ message: "Partida não encontrada." }, { status: 404 });
    }

    if (match.status !== "pending" && match.status !== "in_progress") {
      return NextResponse.json(
        { message: "Só é possível votar para cancelar partidas pendentes ou em andamento." },
        { status: 409 }
      );
    }

    const isParticipant = match.participants.some((p) => p.userId === session.user.id);
    if (!isParticipant) {
      return NextResponse.json(
        { message: "Apenas participantes podem votar para cancelar." },
        { status: 403 }
      );
    }

    const alreadyVoted = match.cancelVotes.some((v) => v.userId === session.user.id);
    if (alreadyVoted) {
      const count = match.cancelVotes.length;
      const threshold = vetoThreshold(match.maxPlayers);
      return NextResponse.json({
        success: true,
        alreadyVoted: true,
        vetoCount: count,
        threshold,
        cancelled: false,
        message: "Você já votou para cancelar.",
      });
    }

    await prisma.matchCancelVote.create({
      data: {
        gameMatchId: match.id,
        userId: session.user.id,
      },
    });

    const votes = await prisma.matchCancelVote.count({
      where: { gameMatchId: match.id },
    });
    const threshold = vetoThreshold(match.maxPlayers);
    let cancelled = false;

    if (votes >= threshold) {
      await prisma.gameMatch.update({
        where: { matchId },
        data: { status: "cancelled", finishedAt: new Date() },
      });
      cancelled = true;
      await invalidateQueueStatusCache();
    }

    return NextResponse.json({
      success: true,
      vetoCount: votes,
      threshold,
      cancelled,
      message: cancelled ? "Partida cancelada por veto popular." : "Seu voto foi registrado.",
    });
  } catch (e) {
    serverError("POST /api/matches/[matchId]/veto", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { message: "Erro ao registrar voto." },
      { status: 500 }
    );
  }
}
