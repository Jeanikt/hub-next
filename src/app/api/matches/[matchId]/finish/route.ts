import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { invalidateQueueStatusCache } from "@/src/lib/redis";
import { verifyAndCompleteMissions } from "@/src/lib/missions/verify";
import { serverError } from "@/src/lib/serverLog";

const MIN_ELO = 0;
const MAX_ELO = 20;
const ELO_WIN = 1;
const ELO_LOSS = 1;

type Params = { params: Promise<{ matchId: string }> };

/**
 * POST /api/matches/[matchId]/finish – encerra a partida (criador ou admin).
 * Body: { winnerTeam: "red" | "blue", matchDurationMinutes?: number, mvpUserId?: string, scores?: { userId: string, kills?: number, deaths?: number, assists?: number, score?: number }[] }
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
      include: { participants: { select: { userId: true, team: true } } },
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
    if (!isAdmin) {
      return NextResponse.json(
        { message: "Apenas um administrador pode encerrar a partida. O resultado é sincronizado automaticamente quando a partida termina no jogo." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const winnerTeam = body.winnerTeam as string;
    if (winnerTeam !== "red" && winnerTeam !== "blue") {
      return NextResponse.json(
        { message: "winnerTeam deve ser 'red' ou 'blue'." },
        { status: 422 }
      );
    }

    const matchDurationMinutes =
      typeof body.matchDurationMinutes === "number"
        ? Math.max(0, body.matchDurationMinutes)
        : undefined;
    const mvpUserId =
      typeof body.mvpUserId === "string" && body.mvpUserId.trim()
        ? body.mvpUserId.trim()
        : undefined;
    const scores = Array.isArray(body.scores) ? body.scores : [];

    const settings = match.settings ? JSON.parse(match.settings) : {};
    if (mvpUserId) settings.mvpUserId = mvpUserId;

    await prisma.$transaction(async (tx) => {
      await tx.gameMatch.update({
        where: { matchId },
        data: {
          status: "finished",
          winnerTeam,
          finishedAt: new Date(),
          matchDuration: matchDurationMinutes != null ? matchDurationMinutes * 60 : null,
          settings: JSON.stringify(settings),
        },
      });

      for (const s of scores) {
        if (typeof s.userId !== "string") continue;
        const participant = match.participants.find((p) => p.userId === s.userId);
        if (!participant) continue;
        const data: { kills?: number; deaths?: number; assists?: number; score?: number } = {};
        if (typeof s.kills === "number") data.kills = s.kills;
        if (typeof s.deaths === "number") data.deaths = s.deaths;
        if (typeof s.assists === "number") data.assists = s.assists;
        if (typeof s.score === "number") data.score = s.score;
        if (Object.keys(data).length === 0) continue;
        await tx.gameMatchUser.updateMany({
          where: {
            gameMatchId: match.id,
            userId: s.userId,
          },
          data,
        });
      }

      const participantUserIds = match.participants.map((p) => p.userId);
      const users = await tx.user.findMany({
        where: { id: { in: participantUserIds } },
        select: { id: true, elo: true },
      });
      const userByTeam = new Map(
        match.participants.map((p) => [p.userId, p.team])
      );

      for (const u of users) {
        const team = userByTeam.get(u.id);
        const won = team === winnerTeam;
        let newElo = u.elo ?? 0;
        if (won) {
          newElo = Math.min(MAX_ELO, newElo + ELO_WIN);
        } else {
          newElo = Math.max(MIN_ELO, newElo - ELO_LOSS);
        }
        if (newElo !== u.elo) {
          await tx.user.update({
            where: { id: u.id },
            data: { elo: newElo },
          });
        }
      }
    });

    await invalidateQueueStatusCache();

    for (const p of match.participants) {
      try {
        await verifyAndCompleteMissions(p.userId);
      } catch {
        // não falha a resposta
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Partida encerrada.",
      winnerTeam,
      matchDurationMinutes: matchDurationMinutes ?? null,
      mvpUserId: mvpUserId ?? null,
    });
  } catch (e) {
    serverError("POST /api/matches/[matchId]/finish", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { error: "Erro ao encerrar partida." },
      { status: 500 }
    );
  }
}
