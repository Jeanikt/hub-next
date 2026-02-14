import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { serverError } from "@/src/lib/serverLog";

type Params = { params: Promise<{ matchId: string }> };

const MAX_CODE_LENGTH = 20;

/** POST /api/matches/[matchId]/valorant-code – criador informa o código da sala no Valorant (ex.: código que aparece ao criar partida custom) */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const { matchId } = await params;
    const match = await prisma.gameMatch.findUnique({
      where: { matchId },
      select: { id: true, creatorId: true, status: true, settings: true },
    });

    if (!match) {
      return NextResponse.json({ message: "Partida não encontrada." }, { status: 404 });
    }

    if (match.creatorId !== session.user.id) {
      return NextResponse.json({ message: "Apenas o criador pode informar o código da sala." }, { status: 403 });
    }

    if (match.status !== "pending" && match.status !== "in_progress") {
      return NextResponse.json({ message: "Partida não está mais ativa." }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const valorantRoomCode = typeof body.valorantRoomCode === "string"
      ? body.valorantRoomCode.trim().slice(0, MAX_CODE_LENGTH)
      : "";

    if (!valorantRoomCode) {
      return NextResponse.json(
        { message: "Envie valorantRoomCode (código que aparece no jogo ao criar a partida custom)." },
        { status: 422 }
      );
    }

    const settings = match.settings ? JSON.parse(match.settings) : {};
    settings.valorant_room_code = valorantRoomCode;

    await prisma.gameMatch.update({
      where: { matchId },
      data: { settings: JSON.stringify(settings) },
    });

    return NextResponse.json({
      success: true,
      message: "Código da sala salvo. Os jogadores podem ver na página da partida.",
      valorant_room_code: valorantRoomCode,
    });
  } catch (e) {
    serverError("POST /api/matches/[matchId]/valorant-code", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { message: "Erro ao salvar código da sala." },
      { status: 500 }
    );
  }
}
