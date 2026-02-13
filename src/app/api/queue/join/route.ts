import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { canJoinQueue } from "@/src/lib/rankPoints";
import { invalidateQueueStatusCache } from "@/src/lib/redis";
import { randomUUID } from "crypto";
import { ROLE_IDS } from "@/src/lib/roles";

const VALID_TYPES = ["low_elo", "high_elo", "inclusive"] as const;
/** 5v5 = 5 jogadores por partida (2 vs 3 ou 3 vs 2). */
const PLAYERS_NEEDED = 5;

const RED_SIZE = 2;
const BLUE_SIZE = 3;

/** Agrupa 5 jogadores em dois times (red/blue): no máximo um por função primária por time. */
function assignTeamsByRole<T extends { userId: string; user: { primaryRole: string | null } }>(
  entries: T[]
): T[][] {
  const red: T[] = [];
  const blue: T[] = [];
  const assigned = new Set<string>();

  for (const role of ROLE_IDS) {
    const withRole = entries.filter((e) => (e.user.primaryRole ?? "") === role);
    withRole.forEach((e, i) => {
      if (assigned.has(e.userId)) return;
      assigned.add(e.userId);
      if (i % 2 === 0 && red.length < RED_SIZE) {
        red.push(e);
      } else if (blue.length < BLUE_SIZE) {
        blue.push(e);
      } else {
        red.push(e);
      }
    });
  }
  const remaining = entries.filter((e) => !assigned.has(e.userId));
  for (const e of remaining) {
    if (red.length < RED_SIZE) red.push(e);
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

    const { getAppSetting } = await import("@/src/lib/redis");
    const queuesDisabled = await getAppSetting("queues_disabled");
    if (queuesDisabled === "1") {
      return NextResponse.json(
        { message: "As filas estão desativadas no momento. Tente mais tarde." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const queue_type = body.queue_type as string | undefined;

    if (!queue_type || !VALID_TYPES.includes(queue_type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json(
        { message: "queue_type inválido. Use: low_elo, high_elo, inclusive." },
        { status: 422 }
      );
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
    if (!canJoinQueue(queue_type as (typeof VALID_TYPES)[number], rankPoints)) {
      return NextResponse.json(
        {
          message:
            "Sua rank atual não permite esta fila. Low ELO: até Platina; High ELO: Diamante ou acima; Inclusiva: qualquer elo.",
        },
        { status: 403 }
      );
    }

    const existing = await prisma.queueEntry.findUnique({
      where: { userId: session.user.id },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Você já está em uma fila.", queue_type: existing.queueType },
        { status: 409 }
      );
    }

    await prisma.queueEntry.create({
      data: {
        userId: session.user.id,
        queueType: queue_type,
      },
    });
    await invalidateQueueStatusCache();

    const entries = await prisma.queueEntry.findMany({
      where: { queueType: queue_type },
      orderBy: { joinedAt: "asc" },
      take: PLAYERS_NEEDED,
      include: { user: { select: { primaryRole: true } } },
    });

    const count = entries.length;
    let matchFound = false;
    let matchId: string | null = null;

    if (count >= PLAYERS_NEEDED) {
      const [redTeam, blueTeam] = assignTeamsByRole(entries);
      const orderedEntries = [...redTeam, ...blueTeam];

      const matchUuid = randomUUID();
      const match = await prisma.gameMatch.create({
        data: {
          matchId: matchUuid,
          type: queue_type,
          status: "pending",
          maxPlayers: PLAYERS_NEEDED,
          settings: JSON.stringify({
            visibility: "public",
            from_queue: true,
            queue_type,
            map_pool: ["Ascent", "Bind", "Haven", "Split", "Icebox"],
          }),
          creatorId: orderedEntries[0].userId,
        },
      });

      for (let i = 0; i < PLAYERS_NEEDED; i++) {
        const team = i < RED_SIZE ? "red" : "blue";
        const role = i === 0 ? "creator" : orderedEntries[i].user.primaryRole ?? "player";
        await prisma.gameMatchUser.create({
          data: {
            gameMatchId: match.id,
            userId: orderedEntries[i].userId,
            team,
            role,
          },
        });
      }

      await prisma.queueEntry.deleteMany({
        where: {
          userId: { in: entries.map((e) => e.userId) },
        },
      });
      await invalidateQueueStatusCache();

      matchFound = true;
      matchId = match.matchId;
    }

    const playersInQueue = await prisma.queueEntry.count({
      where: { queueType: queue_type },
    });

    return NextResponse.json({
      success: true,
      message: matchFound ? "Partida encontrada!" : "Você entrou na fila!",
      queue_type,
      players_in_queue: playersInQueue,
      matchFound,
      matchId,
    });
  } catch (e) {
    console.error("queue join", e);
    return NextResponse.json(
      { message: "Erro ao entrar na fila." },
      { status: 500 }
    );
  }
}
