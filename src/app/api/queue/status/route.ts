import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { getAllowedQueues } from "@/src/lib/rankPoints";
import { getQueueStatusCache, setQueueStatusCache } from "@/src/lib/redis";

const QUEUE_TYPES = ["low_elo", "high_elo", "inclusive"] as const;
/** 5v5 = 5 jogadores por partida. */
const PLAYERS_NEEDED = 5;

async function computeQueues(queueTypeParam: string | null) {
  const queues: Record<string, { count: number; players: unknown[]; players_needed: number; estimated_time: string }> = {};

  for (const type of QUEUE_TYPES) {
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
    if (count >= 9) estimated_time = "Menos de 1 minuto";
    else if (count >= 5) estimated_time = "2-5 minutos";
    else estimated_time = "5+ minutos";

    queues[type] = {
      count,
      players,
      players_needed: Math.max(0, PLAYERS_NEEDED - count),
      estimated_time,
    };
  }
  return queues;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const queueTypeParam = searchParams.get("queue_type");

    let queues: Record<string, { count: number; players: unknown[]; players_needed: number; estimated_time: string }>;

    // Se usuário logado, verificar se está na fila; se estiver, ignorar cache para dados em tempo real
    let userInQueue: string | null = null;
    if (session?.user?.id) {
      const entry = await prisma.queueEntry.findUnique({
        where: { userId: session.user.id },
        select: { queueType: true },
      });
      if (entry) userInQueue = entry.queueType;
    }

    const useCache = !userInQueue;
    const cached = useCache ? await getQueueStatusCache() : null;
    if (cached) {
      try {
        queues = JSON.parse(cached) as Record<string, { count: number; players: unknown[]; players_needed: number; estimated_time: string }>;
        if (queueTypeParam && !queues[queueTypeParam]) {
          queues = await computeQueues(null);
          await setQueueStatusCache(JSON.stringify(queues));
        }
      } catch {
        queues = await computeQueues(null);
        await setQueueStatusCache(JSON.stringify(queues));
      }
    } else {
      queues = await computeQueues(queueTypeParam || null);
      if (!userInQueue) await setQueueStatusCache(JSON.stringify(queues));
    }
    let inQueue = false;
    let currentQueue: string | null = null;
    let queuePlayers: unknown[] = [];
    let hasRiotLinked = false;
    let allowed_queues: string[] = [];

    let matchFound = false;
    let matchId: string | null = null;

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
          include: { gameMatch: { select: { matchId: true, createdAt: true } } },
        }),
      ]);
      hasRiotLinked = !!me?.riotAccount;
      allowed_queues = hasRiotLinked ? getAllowedQueues(me?.elo ?? 0) : [];
      if (myEntry) {
        inQueue = true;
        currentQueue = myEntry.queueType;
        const data = queues[myEntry.queueType];
        if (data) queuePlayers = data.players;
      }
      if (!myEntry && recentMatch?.gameMatch) {
        const createdAt = recentMatch.gameMatch.createdAt.getTime();
        if (Date.now() - createdAt < 120_000) {
          matchFound = true;
          matchId = recentMatch.gameMatch.matchId;
        }
      }
    }

    const status = queueTypeParam ? queues[queueTypeParam] ?? {} : queues;

    return NextResponse.json({
      status: queueTypeParam ? status : queues,
      inQueue,
      currentQueue,
      queuePlayers,
      hasRiotLinked,
      allowed_queues,
      matchFound,
      matchId,
    });
  } catch (e) {
    console.error("queue status", e);
    return NextResponse.json(
      { error: "Erro ao obter status da fila" },
      { status: 500 }
    );
  }
}
