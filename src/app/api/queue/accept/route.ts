import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import {
  getPendingAccept,
  setUserAcceptedInPending,
  deletePendingAccept,
  expirePendingAcceptIfNeeded,
  invalidateQueueStatusCache,
} from "@/src/lib/redis";
import { createMatchFromQueue } from "@/src/lib/queueCreateMatch";
import { ALL_QUEUE_TYPES } from "@/src/lib/queues";
import { serverError } from "@/src/lib/serverLog";

const ACCEPT_DEADLINE_MS = 30_000;

/**
 * POST /api/queue/accept – aceitar ou recusar partida (quando 10 na fila, 30s para aceitar).
 * Body: { accept: true | false }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const accept = body.accept === true;

    const entry = await prisma.queueEntry.findUnique({
      where: { userId: session.user.id },
      select: { queueType: true },
    });
    if (!entry) {
      return NextResponse.json(
        { message: "Você não está em nenhuma fila." },
        { status: 403 }
      );
    }

    const queueType = entry.queueType as (typeof ALL_QUEUE_TYPES)[number];
    if (!ALL_QUEUE_TYPES.includes(queueType)) {
      return NextResponse.json({ message: "Fila inválida." }, { status: 422 });
    }

    // Expirar pending antigo (30s já passou) e remover quem não aceitou
    const notAccepted = await expirePendingAcceptIfNeeded(queueType);
    if (notAccepted?.length) {
      await prisma.queueEntry.deleteMany({
        where: { userId: { in: notAccepted } },
      });
      const remaining = await prisma.queueEntry.count({ where: { queueType } });
      if (remaining === 0) {
        await prisma.queueWaitingMessage.deleteMany({ where: { queueType } });
      }
      await invalidateQueueStatusCache();
    }

    const pending = await getPendingAccept(queueType);
    if (!pending) {
      return NextResponse.json(
        { message: "Não há partida aguardando aceite. Você pode ter demorado mais de 30 segundos." },
        { status: 400 }
      );
    }

    if (!pending.userIds.includes(session.user.id)) {
      return NextResponse.json(
        { message: "Você não está na lista de jogadores desta partida." },
        { status: 403 }
      );
    }

    const elapsed = Date.now() - pending.createdAt;
    if (elapsed > ACCEPT_DEADLINE_MS) {
      await deletePendingAccept(queueType);
      await prisma.queueEntry.deleteMany({
        where: { userId: session.user.id },
      });
      await invalidateQueueStatusCache();
      return NextResponse.json(
        { message: "Tempo esgotado. Você foi removido da fila." },
        { status: 400 }
      );
    }

    if (accept) {
      const result = await setUserAcceptedInPending(queueType, session.user.id, true);
      if (!result) {
        return NextResponse.json({ message: "Erro ao registrar aceite." }, { status: 500 });
      }

      if (result.allAccepted) {
        const created = await createMatchFromQueue(queueType);
        if (created) {
          return NextResponse.json({
            success: true,
            matchFound: true,
            matchId: created.matchId,
            message: "Partida criada! Redirecionando...",
          });
        }
      }

      return NextResponse.json({
        success: true,
        accepted: true,
        acceptedCount: Object.values(result.accepted).filter(Boolean).length,
        total: pending.userIds.length,
      });
    }

    // Recusar: remove da fila e invalida o pending (os outros voltam a 9/10)
    await prisma.queueEntry.delete({
      where: { userId: session.user.id },
    });
    await deletePendingAccept(queueType);
    await invalidateQueueStatusCache();

    return NextResponse.json({
      success: true,
      accepted: false,
      message: "Você saiu da partida. A vaga foi liberada.",
    });
  } catch (e) {
    serverError("POST /api/queue/accept", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao processar aceite." }, { status: 500 });
  }
}
