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

/** POST /api/queue/accept-duo-invite – aceita convite para fila em duo. Body: { inviteId: number } */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const inviteId = typeof body.inviteId === "number" ? body.inviteId : null;
    if (inviteId == null) {
      return NextResponse.json({ message: "inviteId inválido." }, { status: 422 });
    }

    const invite = await prisma.queueDuoInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.toUserId !== session.user.id || invite.status !== "pending") {
      return NextResponse.json({ message: "Convite não encontrado ou já utilizado." }, { status: 404 });
    }

    const qt = invite.queueType as QueueType;
    if (!ALL_QUEUE_TYPES.includes(qt)) {
      return NextResponse.json({ message: "Fila do convite não existe mais." }, { status: 422 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { riotAccount: true, elo: true },
    });
    if (!user?.riotAccount) {
      return NextResponse.json(
        { message: "Vincule sua conta Riot no perfil para entrar na fila." },
        { status: 403 }
      );
    }
    const rankPoints = user.elo ?? 0;
    if (
      qt !== FOURTH_QUEUE_TYPE &&
      !canJoinQueue(qt as "low_elo" | "mid_elo" | "high_elo" | "aberta", rankPoints)
    ) {
      return NextResponse.json(
        { message: "Sua rank atual não permite esta fila." },
        { status: 403 }
      );
    }

    const activeMatch = await prisma.gameMatchUser.findFirst({
      where: { userId: session.user.id, gameMatch: { status: { in: ["pending", "in_progress"] } } },
    });
    if (activeMatch) {
      return NextResponse.json(
        { message: "Você já está em uma partida. Saia dela antes de entrar na fila." },
        { status: 409 }
      );
    }

    const existingEntry = await prisma.queueEntry.findUnique({
      where: { userId: session.user.id },
    });
    if (existingEntry) {
      return NextResponse.json(
        { message: "Você já está em uma fila. Saia dela antes de aceitar o convite." },
        { status: 409 }
      );
    }

    const playersNeeded = getPlayersRequired(qt);
    const currentCount = await prisma.queueEntry.count({
      where: { queueType: qt },
    });
    if (currentCount >= playersNeeded) {
      return NextResponse.json(
        { message: "Esta fila já está cheia. O convite não pode ser aceito agora." },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.queueDuoInvite.update({
        where: { id: inviteId },
        data: { status: "accepted" },
      }),
      prisma.queueEntry.create({
        data: { userId: session.user.id, queueType: qt },
      }),
    ]);
    await invalidateQueueStatusCache();

    const entries = await prisma.queueEntry.findMany({
      where: { queueType: qt },
      orderBy: { joinedAt: "asc" },
      take: playersNeeded,
      include: { user: { select: { primaryRole: true } } },
    });

    let matchFound = false;
    let pendingAccept = false;
    const acceptDeadline = Date.now() + 30_000;

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
      message: matchFound ? "Partida encontrada! Aceite em 30 segundos." : "Você entrou na fila em duo!",
      queue_type: qt,
      players_in_queue: playersInQueue,
      matchFound,
      pendingAccept: matchFound ? true : undefined,
      acceptDeadline: matchFound ? acceptDeadline : undefined,
    });
  } catch (e) {
    serverError("POST /api/queue/accept-duo-invite", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao aceitar convite." }, { status: 500 });
  }
}
