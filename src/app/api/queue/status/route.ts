import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { getAllowedQueues } from "@/src/lib/rankPoints";
import { getQueueStatusCache, setQueueStatusCache, getPendingAccept, expirePendingAcceptIfNeeded, invalidateQueueStatusCache } from "@/src/lib/redis";
import {
  PUBLIC_QUEUE_TYPES,
  FOURTH_QUEUE_TYPE,
  getPlayersRequired,
} from "@/src/lib/queues";
import { serverError } from "@/src/lib/serverLog";

async function computeQueues(
  queueTypeParam: string | null,
  includeFourthQueue: boolean
) {
  const types = [...PUBLIC_QUEUE_TYPES, FOURTH_QUEUE_TYPE] as string[];

  const queues: Record<string, { count: number; players: unknown[]; players_needed: number; estimated_time: string; required: number }> = {};

  for (const type of types) {
    if (queueTypeParam && queueTypeParam !== type) continue;

    const entries = await prisma.queueEntry.findMany({
      where: { queueType: type },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            elo: true,
            primaryRole: true,
            secondaryRole: true,
            level: true,
            image: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const count = entries.length;
    const needed = getPlayersRequired(type);
    const players = entries.map((e) => ({
      id: e.user.id,
      username: e.user.username,
      elo: e.user.elo,
      primary_role: e.user.primaryRole ?? "flex",
      secondary_role: e.user.secondaryRole ?? "flex",
      level: e.user.level,
      avatar_url: e.user.image,
      joined_at: Math.floor(e.joinedAt.getTime() / 1000),
    }));

    let estimated_time = "Indisponível";
    if (type === FOURTH_QUEUE_TYPE) {
      estimated_time = count >= 1 ? "Menos de 1 minuto" : "Aguardando outro jogador";
    } else {
      if (count >= 9) estimated_time = "Menos de 1 minuto";
      else if (count >= 6) estimated_time = "2-5 minutos";
      else estimated_time = "5+ minutos";
    }

    queues[type] = {
      count,
      players,
      players_needed: Math.max(0, needed - count),
      estimated_time,
      required: needed,
    };
  }
  return queues;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    // 4ª fila: apenas jeandev003 e yagobtelles (e-mail na sessão ou no DB)
    const searchParams = request.nextUrl.searchParams;
    const queueTypeParam = searchParams.get("queue_type");

    let queues: Record<string, { count: number; players: unknown[]; players_needed: number; estimated_time: string }>;

    // Se usuário logado, verificar se está na fila ou tem partida recente (para não usar cache e retornar matchFound)
    let userInQueue: string | null = null;
    let userHasRecentMatch = false;
    if (session?.user?.id) {
      const [entry, recentMatch] = await Promise.all([
        prisma.queueEntry.findUnique({
          where: { userId: session.user.id },
          select: { queueType: true },
        }),
        prisma.gameMatchUser.findFirst({
          where: { userId: session.user.id },
          orderBy: { joinedAt: "desc" },
          select: { gameMatch: { select: { matchId: true, createdAt: true, status: true } } },
        }),
      ]);
      if (entry) userInQueue = entry.queueType;
      if (!entry && recentMatch?.gameMatch) {
        const status = recentMatch.gameMatch.status;
        const isActive = status === "pending" || status === "in_progress";
        const created = recentMatch.gameMatch.createdAt.getTime();
        userHasRecentMatch = isActive && Date.now() - created < 300_000; // 5 min: só partida ativa redireciona
      }
    }

    const useCache = !userInQueue && !userHasRecentMatch;
    const cached = useCache ? await getQueueStatusCache() : null;
    if (cached) {
      try {
        queues = JSON.parse(cached) as Record<string, { count: number; players: unknown[]; players_needed: number; estimated_time: string }>;
        if (queueTypeParam && !queues[queueTypeParam]) {
          queues = await computeQueues(null, false);
          await setQueueStatusCache(JSON.stringify(queues));
        }
      } catch {
        queues = await computeQueues(null, false);
        await setQueueStatusCache(JSON.stringify(queues));
      }
    } else {
      queues = await computeQueues(queueTypeParam || null, true);
      if (!userInQueue) await setQueueStatusCache(JSON.stringify(queues));
    }

    let inQueue = false;
    let currentQueue: string | null = null;
    let queuePlayers: unknown[] = [];
    let hasRiotLinked = false;
    let allowed_queues: string[] = [];

    let matchFound = false;
    let matchId: string | null = null;
    let pendingAccept = false;
    let acceptDeadline: number | null = null;

    if (session?.user?.id) {
      const [me, myEntry, recentMatch] = await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { riotAccount: true, elo: true },
        }),
        prisma.queueEntry.findUnique({
          where: { userId: session.user.id },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                elo: true,
                primaryRole: true,
                secondaryRole: true,
                level: true,
                image: true,
              },
            },
          },
        }),
        prisma.gameMatchUser.findFirst({
          where: { userId: session.user.id },
          orderBy: { joinedAt: "desc" },
          include: { gameMatch: { select: { matchId: true, createdAt: true, status: true } } },
        }),
      ]);
      hasRiotLinked = !!me?.riotAccount;
      allowed_queues = hasRiotLinked ? getAllowedQueues(me?.elo ?? 0) : [];
      allowed_queues.push(FOURTH_QUEUE_TYPE);
      if (myEntry) {
        inQueue = true;
        currentQueue = myEntry.queueType;
        const data = queues[myEntry.queueType];
        if (data) queuePlayers = data.players;
        const pending = await getPendingAccept(myEntry.queueType);
        if (pending?.userIds.includes(session.user.id)) {
          const elapsed = Date.now() - pending.createdAt;
          if (elapsed < 30_000) {
            pendingAccept = true;
            acceptDeadline = pending.createdAt + 30_000;
          }
        }
        const notAccepted = await expirePendingAcceptIfNeeded(myEntry.queueType);
        if (notAccepted?.length) {
          await prisma.queueEntry.deleteMany({ where: { userId: { in: notAccepted } } });
          await invalidateQueueStatusCache();
        }
      }
      if (!myEntry && recentMatch?.gameMatch) {
        const status = recentMatch.gameMatch.status;
        const isActive = status === "pending" || status === "in_progress";
        const createdAt = recentMatch.gameMatch.createdAt.getTime();
        if (isActive && Date.now() - createdAt < 300_000) {
          matchFound = true;
          matchId = recentMatch.gameMatch.matchId;
        }
      }
    }

    const status = queueTypeParam ? queues[queueTypeParam] ?? {} : queues;

    const body = {
      status: queueTypeParam ? status : queues,
      inQueue,
      currentQueue,
      queuePlayers,
      hasRiotLinked,
      allowed_queues,
      matchFound,
      matchId,
      pendingAccept: pendingAccept || undefined,
      acceptDeadline: acceptDeadline ?? undefined,
    };
    const headers: HeadersInit = {};
    if (!session?.user?.id) {
      headers["Cache-Control"] = "public, s-maxage=3, stale-while-revalidate=5";
    }
    return NextResponse.json(body, { headers });
  } catch (e) {
    serverError("GET /api/queue/status", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { error: "Erro ao obter status da fila" },
      { status: 500 }
    );
  }
}
