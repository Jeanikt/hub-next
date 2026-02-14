import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { sendLobbyMessageSchema } from "@/src/lib/validators/schemas";

/** POST /api/lobby-messages/send – enviar mensagem no lobby (body: matchId, content) */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = sendLobbyMessageSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? "matchId e content são obrigatórios.";
      return NextResponse.json({ message: msg }, { status: 422 });
    }
    const { matchId, content } = parsed.data;

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

    const message = await prisma.lobbyMessage.create({
      data: {
        gameMatchId: match.id,
        userId: session.user.id,
        content,
      },
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
    });

    return NextResponse.json({
      id: message.id,
      content: message.content,
      userId: message.userId,
      user: message.user,
      createdAt: message.createdAt,
    });
  } catch (e) {
    serverError("POST /api/lobby-messages/send", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao enviar mensagem." }, { status: 500 });
  }
}
