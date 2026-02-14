import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";

type Params = { params: Promise<{ matchId: string }> };

/** GET /api/lobby-messages/[matchId] – listar mensagens do lobby da partida */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const { matchId } = await params;

    const match = await prisma.gameMatch.findUnique({
      where: { matchId },
      select: { id: true },
    });
    if (!match) {
      return NextResponse.json({ message: "Partida não encontrada." }, { status: 404 });
    }

    const inMatch = await prisma.gameMatchUser.findUnique({
      where: {
        gameMatchId_userId: { gameMatchId: match.id, userId: session.user.id },
      },
    });
    if (!inMatch) {
      return NextResponse.json({ message: "Você não está nesta partida." }, { status: 403 });
    }

    const messages = await prisma.lobbyMessage.findMany({
      where: { gameMatchId: match.id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        userId: m.userId,
        user: m.user,
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    serverError("GET /api/lobby-messages/[matchId]", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao listar mensagens." }, { status: 500 });
  }
}
