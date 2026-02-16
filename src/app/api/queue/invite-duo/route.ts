import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { ALL_QUEUE_TYPES } from "@/src/lib/queues";
import { createNotification } from "@/src/lib/notifications";
import { serverError } from "@/src/lib/serverLog";

/** POST /api/queue/invite-duo – convida um amigo para a mesma fila (quem está na fila chama). Body: { toUserId: string } */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const toUserId = typeof body.toUserId === "string" ? body.toUserId.trim() : null;
    if (!toUserId || toUserId === session.user.id) {
      return NextResponse.json({ message: "toUserId inválido." }, { status: 422 });
    }

    const entry = await prisma.queueEntry.findUnique({
      where: { userId: session.user.id },
    });
    if (!entry || !ALL_QUEUE_TYPES.includes(entry.queueType as (typeof ALL_QUEUE_TYPES)[number])) {
      return NextResponse.json({ message: "Você precisa estar em uma fila para convidar alguém." }, { status: 403 });
    }

    const areFriends = await prisma.friend.findFirst({
      where: {
        status: "accepted",
        OR: [
          { userId: session.user.id, friendId: toUserId },
          { userId: toUserId, friendId: session.user.id },
        ],
      },
    });
    if (!areFriends) {
      return NextResponse.json({ message: "Só é possível convidar amigos." }, { status: 403 });
    }

    const existing = await prisma.queueDuoInvite.findUnique({
      where: {
        fromUserId_toUserId_queueType: {
          fromUserId: session.user.id,
          toUserId,
          queueType: entry.queueType,
        },
      },
    });
    if (existing && existing.status === "pending") {
      return NextResponse.json({ message: "Convite já enviado para este amigo nesta fila." }, { status: 409 });
    }

    await prisma.queueDuoInvite.upsert({
      where: {
        fromUserId_toUserId_queueType: {
          fromUserId: session.user.id,
          toUserId,
          queueType: entry.queueType,
        },
      },
      create: {
        fromUserId: session.user.id,
        toUserId,
        queueType: entry.queueType,
        status: "pending",
      },
      update: { status: "pending" },
    });

    const fromUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, name: true },
    });
    const displayName = fromUser?.name || fromUser?.username || "Alguém";
    const queueName = entry.queueType === "test_2v2" ? "1x1" : entry.queueType === "aberta" ? "Inclusiva" : entry.queueType;

    await createNotification(toUserId, {
      type: "generic",
      title: "Convite para fila em duo",
      body: `${displayName} te convidou para a fila ${queueName}. Aceite para entrar na mesma fila.`,
    });

    return NextResponse.json({ success: true, message: "Convite enviado." });
  } catch (e) {
    serverError("POST /api/queue/invite-duo", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao enviar convite." }, { status: 500 });
  }
}
