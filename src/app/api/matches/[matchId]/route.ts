import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { serverError } from "@/src/lib/serverLog";

type Params = { params: Promise<{ matchId: string }> };

/** GET /api/matches/[matchId] – detalhes da partida (público) */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { matchId } = await params;
    const session = await auth();
    const isAdmin = session ? isAllowedAdmin(session) : false;

    const match = await prisma.gameMatch.findUnique({
      where: { matchId },
      include: {
        creator: { select: { id: true, username: true, name: true } },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                riotId: true,
                tagline: true,
                elo: true,
                rank: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ message: "Partida não encontrada." }, { status: 404 });
    }

    const userInMatch = session?.user?.id
      ? match.participants.some((p) => p.userId === session.user.id)
      : false;
    const isCreator = session?.user?.id ? match.creatorId === session.user.id : false;

    return NextResponse.json({
      ...match,
      settings: match.settings ? JSON.parse(match.settings) : null,
      participants: match.participants.map((p) => ({
        ...p,
        user: p.user,
      })),
      playerCount: match.participants.length,
      isFull: match.participants.length >= match.maxPlayers,
      userInMatch,
      isCreator,
      isAdmin,
    });
  } catch (e) {
    serverError("GET /api/matches/[matchId]", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao buscar partida." }, { status: 500 });
  }
}
