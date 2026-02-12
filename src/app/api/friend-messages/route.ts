import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isUserOnline } from "@/src/lib/online";

/** GET /api/friend-messages?username=xxx ou ?friend_id=xxx – lista mensagens com o amigo */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const username = request.nextUrl.searchParams.get("username");
    const friendIdParam = request.nextUrl.searchParams.get("friend_id");

    let peerId: string | null = null;
    if (friendIdParam) {
      peerId = friendIdParam;
    } else if (username) {
      const u = await prisma.user.findUnique({ where: { username } });
      if (!u) {
        return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
      }
      peerId = u.id;
    } else {
      return NextResponse.json({ message: "Envie username ou friend_id." }, { status: 422 });
    }

    const peer = await prisma.user.findUnique({
      where: { id: peerId },
      select: { id: true, username: true, name: true, isOnline: true, lastLoginAt: true },
    });
    if (!peer) {
      return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
    }

    const messages = await prisma.friendMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: peerId },
          { senderId: peerId, receiverId: session.user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json({
      peer: { id: peer.id, username: peer.username, name: peer.name, isOnline: isUserOnline(peer.lastLoginAt) },
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        receiverId: m.receiverId,
        sender: m.sender,
        receiver: m.receiver,
        readAt: m.readAt,
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    console.error("friend-messages list", e);
    return NextResponse.json({ error: "Erro ao listar mensagens." }, { status: 500 });
  }
}
