import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";

type Params = { params: Promise<{ matchId: string }> };

/** POST /api/matches/[matchId]/cancel – apenas o criador pode cancelar */
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
        participants: {
          where: { role: "creator" },
          take: 1,
        },
      },
    });

    if (!match) {
      return NextResponse.json({ message: "Partida não encontrada." }, { status: 404 });
    }

    if (match.status !== "pending") {
      return NextResponse.json(
        { message: "Apenas partidas pendentes podem ser canceladas." },
        { status: 409 }
      );
    }

    const creator = match.participants[0];
    if (!creator || creator.userId !== session.user.id) {
      return NextResponse.json(
        { message: "Apenas o criador pode cancelar a partida." },
        { status: 403 }
      );
    }

    await prisma.gameMatch.update({
      where: { matchId },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ success: true, message: "Partida cancelada." });
  } catch (e) {
    console.error("match cancel", e);
    return NextResponse.json(
      { message: "Erro ao cancelar partida." },
      { status: 500 }
    );
  }
}
