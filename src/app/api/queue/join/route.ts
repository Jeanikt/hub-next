import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { canJoinQueue } from "@/src/lib/rankPoints";
import {
  invalidateQueueStatusCache,
  getPendingAccept,
  setPendingAccept,
} from "@/src/lib/redis";
import {
  ALL_QUEUE_TYPES,
  FOURTH_QUEUE_TYPE,
  getPlayersRequired,
} from "@/src/lib/queues";
import { serverError } from "@/src/lib/serverLog";

type QueueType = (typeof ALL_QUEUE_TYPES)[number];

function getQueueSizes(qt: QueueType): { playersNeeded: number } {
  return { playersNeeded: getPlayersRequired(qt) };
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
        { message: "queue_type inválido. Use: low_elo, mid_elo, high_elo, aberta, test_2v2." },
        { status: 422 }
      );
    }

    const qt = queue_type as QueueType;

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
    if (
      qt !== FOURTH_QUEUE_TYPE &&
      !canJoinQueue(qt as "low_elo" | "mid_elo" | "high_elo" | "aberta", rankPoints)
    ) {
      return NextResponse.json(
        {
          message:
            "Sua rank atual não permite esta fila. Low ELO: até Platina 3; Mid ELO: Diamante 1 até Ascendente 3; High ELO: Imortal+; Inclusiva: qualquer elo.",
        },
        { status: 403 }
      );
    }

      // bloqueia se já está em uma partida pendente ou em andamento (exceto canceled)
      const activeMatch = await prisma.gameMatchUser.findFirst({
        where: { userId: session.user.id, gameMatch: { status: { in: ["pending", "in_progress"] } } },
      });
      if (activeMatch) {
        return NextResponse.json(
          { message: "Você já está em uma partida pendente ou em andamento; não é possível entrar na fila." },
          { status: 409 }
        );
      }

    // Um usuário não pode estar em duas filas ao mesmo tempo (schema: userId único em QueueEntry)
    const existing = await prisma.queueEntry.findUnique({
      where: { userId: session.user.id },
    });
    if (existing) {
      return NextResponse.json(
        {
          message: "Você já está em uma fila. Não é possível entrar em outra ao mesmo tempo. Saia da fila atual primeiro.",
          queue_type: existing.queueType,
        },
        { status: 409 }
      );
    }

    // entra na fila
    await prisma.queueEntry.create({
      data: { userId: session.user.id, queueType: qt },
    });
    await invalidateQueueStatusCache();

    const { playersNeeded } = getQueueSizes(qt);

    const entries = await prisma.queueEntry.findMany({
      where: { queueType: qt },
      orderBy: { joinedAt: "asc" },
      take: playersNeeded,
      include: { user: { select: { primaryRole: true } } },
    });

    let matchFound = false;
    let matchId: string | null = null;
    let pendingAccept = false;
    const acceptDeadline = Date.now() + 10_000;

    if (entries.length >= playersNeeded) {
      const alreadyPending = await getPendingAccept(qt);
      if (!alreadyPending) {
        const didSet = await setPendingAccept(qt, entries.map((e) => e.userId));
        if (didSet) {
          matchFound = true;
          pendingAccept = true;
        }
      }
    }

    const playersInQueue = await prisma.queueEntry.count({
      where: { queueType: qt },
    });

    return NextResponse.json({
      success: true,
      message: matchFound ? "Partida encontrada! Aceite em 10 segundos." : "Você entrou na fila!",
      queue_type: qt,
      players_in_queue: playersInQueue,
      matchFound,
      matchId,
      pendingAccept: matchFound ? true : undefined,
      acceptDeadline: matchFound ? acceptDeadline : undefined,
    });
  } catch (e) {
    serverError("POST /api/queue/join", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao entrar na fila." }, { status: 500 });
  }
}
