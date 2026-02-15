import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { syncSingleMatchFromRiot } from "@/src/lib/matchSync";
import { serverError } from "@/src/lib/serverLog";

type Params = { params: Promise<{ matchId: string }> };

/**
 * POST /api/matches/[matchId]/conclude – conclui a partida sincronizando com a API Riot.
 * Busca a última partida do criador, valida mapa/jogadores e distribui pontos.
 * Criador da partida ou admin.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const { matchId } = await params;
    const match = await prisma.gameMatch.findUnique({
      where: { matchId },
      select: { id: true, creatorId: true, status: true },
    });

    if (!match) {
      return NextResponse.json({ message: "Partida não encontrada." }, { status: 404 });
    }
    if (match.status === "finished" || match.status === "cancelled") {
      return NextResponse.json(
        { message: "Partida já foi encerrada ou cancelada." },
        { status: 400 }
      );
    }

    const isAdmin = isAllowedAdmin(session);
    const isCreator = match.creatorId === session.user.id;
    if (!isAdmin && !isCreator) {
      return NextResponse.json(
        { message: "Apenas o criador da partida ou um administrador pode concluir." },
        { status: 403 }
      );
    }

    const result = await syncSingleMatchFromRiot(matchId);
    if (result.success) {
      return NextResponse.json({
        ok: true,
        message: "Partida concluída. Pontos distribuídos.",
        winnerTeam: result.winnerTeam,
      });
    }
    return NextResponse.json(
      { message: result.error ?? "Não foi possível concluir a partida." },
      { status: 400 }
    );
  } catch (e) {
    serverError("POST /api/matches/[matchId]/conclude", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { message: "Erro ao concluir partida." },
      { status: 500 }
    );
  }
}
