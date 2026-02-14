import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { serverError } from "@/src/lib/serverLog";

type Params = { params: Promise<{ matchId: string }> };

/** POST /api/matches/[matchId]/join – entrar na partida */
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
        participants: true,
      },
    });

    if (!match) {
      return NextResponse.json({ message: "Partida não encontrada." }, { status: 404 });
    }

    // bloqueia se já está em uma partida pendente ou em andamento (exceto canceled) diferente desta
    const activeOther = await prisma.gameMatchUser.findFirst({
      where: {
        userId: session.user.id,
        gameMatch: { status: { in: ["pending", "in_progress"] }, matchId: { not: matchId } },
      },
    });
    if (activeOther) {
      return NextResponse.json(
        { message: "Você já está em outra partida pendente ou em andamento; não é possível entrar nesta." },
        { status: 409 }
      );
    }

    if (match.status !== "pending") {
      return NextResponse.json(
        { message: "Esta partida não está mais disponível." },
        { status: 409 }
      );
    }

    if (match.participants.length >= match.maxPlayers) {
      return NextResponse.json({ message: "A partida está cheia." }, { status: 409 });
    }

    const alreadyIn = match.participants.some((p) => p.userId === session.user.id);
    if (alreadyIn) {
      return NextResponse.json({ message: "Você já está nesta partida." }, { status: 409 });
    }

    const redCount = match.participants.filter((p) => p.team === "red").length;
    const blueCount = match.participants.filter((p) => p.team === "blue").length;
    const team = redCount <= blueCount ? "red" : "blue";

    await prisma.gameMatchUser.create({
      data: {
        gameMatchId: match.id,
        userId: session.user.id,
        team,
        role: "player",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Você entrou na partida!",
      team,
    });
  } catch (e) {
    serverError("POST /api/matches/[matchId]/join", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { message: "Erro ao entrar na partida." },
      { status: 500 }
    );
  }
}
