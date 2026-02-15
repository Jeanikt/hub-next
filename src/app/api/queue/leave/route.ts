import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { getPendingAccept, invalidateQueueStatusCache } from "@/src/lib/redis";
import { serverError } from "@/src/lib/serverLog";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const entry = await prisma.queueEntry.findUnique({
      where: { userId: session.user.id },
    });

    if (!entry) {
      return NextResponse.json(
        { message: "Você não está em nenhuma fila." },
        { status: 409 }
      );
    }

    const pending = await getPendingAccept(entry.queueType);
    if (pending?.userIds.includes(session.user.id)) {
      const elapsed = Date.now() - pending.createdAt;
      if (elapsed < 10_000) {
        return NextResponse.json(
          { message: "Você já aceitou a partida. Não é possível sair durante os 10 segundos de confirmação. Use Recusar no modal se não quiser jogar." },
          { status: 409 }
        );
      }
    }

    const queueType = entry.queueType;
    await prisma.queueEntry.delete({
      where: { userId: session.user.id },
    });
    const remaining = await prisma.queueEntry.count({ where: { queueType } });
    if (remaining === 0) {
      await prisma.queueWaitingMessage.deleteMany({ where: { queueType } });
    }
    await invalidateQueueStatusCache();

    return NextResponse.json({
      success: true,
      message: "Você saiu da fila.",
    });
  } catch (e) {
    serverError("POST /api/queue/leave", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { message: "Erro ao sair da fila." },
      { status: 500 }
    );
  }
}
