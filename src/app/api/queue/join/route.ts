import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { canJoinQueue } from "@/src/lib/rankPoints";
import {
  invalidateQueueStatusCache,
  acquireQueueMatchLock,
  releaseQueueMatchLock,
} from "@/src/lib/redis";
import { randomUUID } from "crypto";
import { ROLE_IDS } from "@/src/lib/roles";
import { generateMatchCode } from "@/src/lib/inviteCode";
import { canSeeFourthQueue } from "@/src/lib/admin";
import {
  ALL_QUEUE_TYPES,
  FOURTH_QUEUE_TYPE,
  getPlayersRequired,
} from "@/src/lib/queues";
import { serverError } from "@/src/lib/serverLog";

type QueueType = (typeof ALL_QUEUE_TYPES)[number];

function getQueueSizes(qt: QueueType): { playersNeeded: number; redSize: number; blueSize: number } {
  const needed = getPlayersRequired(qt);
  if (needed === 2) return { playersNeeded: 2, redSize: 1, blueSize: 1 };
  return { playersNeeded: 10, redSize: 5, blueSize: 5 };
}

/** Agrupa jogadores em dois times (red/blue). Para 2 jogadores: primeiro red, segundo blue. */
function assignTeamsByRole<
  T extends { userId: string; user: { primaryRole: string | null } }
>(entries: T[], redSize: number, blueSize: number): T[][] {
  const red: T[] = [];
  const blue: T[] = [];
  const assigned = new Set<string>();

  for (const role of ROLE_IDS) {
    const withRole = entries.filter((e) => (e.user.primaryRole ?? "") === role);
    withRole.forEach((e, i) => {
      if (assigned.has(e.userId)) return;
      assigned.add(e.userId);
      if (i % 2 === 0 && red.length < redSize) red.push(e);
      else if (blue.length < blueSize) blue.push(e);
      else red.push(e);
    });
  }

  const remaining = entries.filter((e) => !assigned.has(e.userId));
  for (const e of remaining) {
    if (red.length < redSize) red.push(e);
    else blue.push(e);
  }
  return [red, blue];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    // toggle filas
    const { getAppSetting } = await import("@/src/lib/redis");
    const queuesDisabled = (await getAppSetting("queues_disabled")) ?? "0";
    if (queuesDisabled === "1") {
      return NextResponse.json(
        { message: "As filas estão desativadas no momento. Tente mais tarde." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const queue_type = body.queue_type as string | undefined;

    if (!queue_type || !ALL_QUEUE_TYPES.includes(queue_type as QueueType)) {
      return NextResponse.json(
        { message: "queue_type inválido. Use: low_elo, high_elo, inclusive, test_2v2." },
        { status: 422 }
      );
    }

    const qt = queue_type as QueueType;

    if (qt === FOURTH_QUEUE_TYPE) {
      if (!canSeeFourthQueue(session)) {
        return NextResponse.json(
          { message: "A 4ª fila (Teste 2v2) é restrita a usuários autorizados." },
          { status: 403 }
        );
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { riotAccount: true, elo: true },
    });

    if (!user?.riotAccount) {
      return NextResponse.json(
        { message: "Vincule sua conta Riot no perfil ou no onboarding para entrar na fila." },
        { status: 403 }
      );
    }

    const rankPoints = user.elo ?? 0;
    if (qt !== FOURTH_QUEUE_TYPE && !canJoinQueue(qt as "low_elo" | "high_elo" | "inclusive", rankPoints)) {
      return NextResponse.json(
        {
          message:
            "Sua rank atual não permite esta fila. Low ELO: até Platina 3; High ELO: Diamante ou acima; Inclusiva: qualquer elo.",
        },
        { status: 403 }
      );
    }

    // já tá em uma fila?
    const existing = await prisma.queueEntry.findUnique({
      where: { userId: session.user.id },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Você já está em uma fila.", queue_type: existing.queueType },
        { status: 409 }
      );
    }

    // entra na fila
    await prisma.queueEntry.create({
      data: { userId: session.user.id, queueType: qt },
    });
    await invalidateQueueStatusCache();

    const { playersNeeded, redSize, blueSize } = getQueueSizes(qt);

    const entries = await prisma.queueEntry.findMany({
      where: { queueType: qt },
      orderBy: { joinedAt: "asc" },
      take: playersNeeded,
      include: { user: { select: { primaryRole: true } } },
    });

    let matchFound = false;
    let matchId: string | null = null;

    if (entries.length >= playersNeeded) {
      const lock = await acquireQueueMatchLock(qt, 12);
      if (lock) {
        try {
          const lockedEntries = await prisma.queueEntry.findMany({
            where: { queueType: qt },
            orderBy: { joinedAt: "asc" },
            take: playersNeeded,
            include: { user: { select: { primaryRole: true } } },
          });

          if (lockedEntries.length >= playersNeeded) {
            const [redTeam, blueTeam] = assignTeamsByRole(lockedEntries, redSize, blueSize);
            const orderedEntries = [...redTeam, ...blueTeam].slice(0, playersNeeded);

            const mapPool = ["Ascent", "Bind", "Haven", "Split", "Icebox"];
            const chosenMap = mapPool[Math.floor(Math.random() * mapPool.length)];
            const matchCode = generateMatchCode();
            const matchUuid = randomUUID();

            const match = await prisma.$transaction(async (tx) => {
              const created = await tx.gameMatch.create({
                data: {
                  matchId: matchUuid,
                  type: qt,
                  status: "in_progress",
                  map: chosenMap,
                  maxPlayers: playersNeeded,
                  startedAt: new Date(),
                  settings: JSON.stringify({
                    visibility: qt === FOURTH_QUEUE_TYPE ? "test" : "public",
                    queue_type: qt,
                    map_pool: mapPool,
                    match_code: matchCode,
                  }),
                  creatorId: orderedEntries[0].userId,
                },
              });

              await tx.gameMatchUser.createMany({
                data: orderedEntries.map((e, i) => {
                  const team = i < redSize ? "red" : "blue";
                  const role = i === 0 ? "creator" : e.user.primaryRole ?? "player";
                  return {
                    gameMatchId: created.id,
                    userId: e.userId,
                    team,
                    role,
                  };
                }),
              });

              await tx.queueEntry.deleteMany({
                where: { userId: { in: orderedEntries.map((e) => e.userId) } },
              });

              return created;
            });

            await invalidateQueueStatusCache();

            matchFound = true;
            matchId = match.matchId;
          }
        } finally {
          await releaseQueueMatchLock(lock);
        }
      }
    }

    const playersInQueue = await prisma.queueEntry.count({
      where: { queueType: qt },
    });

    return NextResponse.json({
      success: true,
      message: matchFound ? "Partida encontrada!" : "Você entrou na fila!",
      queue_type: qt,
      players_in_queue: playersInQueue,
      matchFound,
      matchId,
    });
  } catch (e) {
    serverError("POST /api/queue/join", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao entrar na fila." }, { status: 500 });
  }
}
