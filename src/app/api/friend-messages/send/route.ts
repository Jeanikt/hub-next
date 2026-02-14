import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { sendFriendMessageSchema } from "@/src/lib/validators/schemas";

/** POST /api/friend-messages/send – enviar mensagem para amigo */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = sendFriendMessageSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? "receiver_id e content são obrigatórios.";
      return NextResponse.json({ message: msg }, { status: 422 });
    }
    const { receiver_id: receiverId, content } = parsed.data;

    const areFriends = await prisma.friend.findFirst({
      where: {
        status: "accepted",
        OR: [
          { userId: session.user.id, friendId: receiverId },
          { userId: receiverId, friendId: session.user.id },
        ],
      },
    });

    if (!areFriends) {
      return NextResponse.json({ message: "Apenas amigos podem trocar mensagens." }, { status: 403 });
    }

    const message = await prisma.friendMessage.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content,
      },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json({
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      createdAt: message.createdAt,
    });
  } catch (e) {
    serverError("POST /api/friend-messages/send", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao enviar mensagem." }, { status: 500 });
  }
}
