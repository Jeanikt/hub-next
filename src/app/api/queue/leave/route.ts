import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { invalidateQueueStatusCache } from "@/src/lib/redis";
import { triggerQueueUpdate } from "@/src/lib/pusher";

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

    await prisma.queueEntry.delete({
      where: { userId: session.user.id },
    });
    await invalidateQueueStatusCache();
    triggerQueueUpdate().catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Você saiu da fila.",
    });
  } catch (e) {
    console.error("queue leave", e);
    return NextResponse.json(
      { message: "Erro ao sair da fila." },
      { status: 500 }
    );
  }
}
