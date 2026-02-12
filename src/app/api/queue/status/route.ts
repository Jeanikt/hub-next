import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { getAllowedQueues } from "@/src/lib/rankPoints";
import { getQueueStatusCache, setQueueStatusCache } from "@/src/lib/redis";

const QUEUE_TYPES = ["low_elo", "high_elo", "inclusive"] as const;
const PLAYERS_NEEDED = 10;

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

    const cached = await getQueueStatusCache();
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
      queues = await computeQueues(null);
      await setQueueStatusCache(JSON.stringify(queues));
    }
    let inQueue = false;
    let currentQueue: string | null = null;
    let queuePlayers: unknown[] = [];
    let hasRiotLinked = false;
    let allowed_queues: string[] = [];

    if (session?.user?.id) {
      const [me, myEntry] = await Promise.all([
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
      ]);
      hasRiotLinked = !!me?.riotAccount;
      allowed_queues = hasRiotLinked ? getAllowedQueues(me?.elo ?? 0) : [];
      if (myEntry) {
        inQueue = true;
        currentQueue = myEntry.queueType;
        const data = queues[myEntry.queueType];
        if (data) queuePlayers = data.players;
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
    });
  } catch (e) {
    console.error("queue status", e);
    return NextResponse.json(
      { error: "Erro ao obter status da fila" },
      { status: 500 }
    );
  }
}
