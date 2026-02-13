import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isUserOnline } from "@/src/lib/online";

/** GET /api/friend-messages?username=xxx ou ?friend_id=xxx – lista mensagens com o amigo */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const username = request.nextUrl.searchParams.get("username")?.trim() || null;
  const friendIdParam = request.nextUrl.searchParams.get("friend_id")?.trim() || null;

  let peerId: string | null = null;
  if (friendIdParam) {
    peerId = friendIdParam;
  } else if (username) {
    try {
      const u = await prisma.user.findFirst({ where: { username }, select: { id: true } });
      if (!u) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
      peerId = u.id;
    } catch (e) {
      console.error("friend-messages resolve username", e);
      return NextResponse.json({ error: "Erro ao listar mensagens." }, { status: 500 });
    }
  } else {
    return NextResponse.json({ message: "Envie username ou friend_id." }, { status: 422 });
  }

  try {
    const peer = await prisma.user.findUnique({
      where: { id: peerId },
      select: { id: true, username: true, name: true, lastLoginAt: true },
    });
    if (!peer) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });

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
      peer: {
        id: peer.id,
        username: peer.username,
        name: peer.name,
        isOnline: isUserOnline(peer.lastLoginAt),
      },
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        receiverId: m.receiverId,
        sender: m.sender,
        receiver: m.receiver,
        readAt: m.readAt ? (m.readAt as Date).toISOString() : null,
        createdAt: (m.createdAt as Date).toISOString(),
      })),
    });
  } catch (e) {
    console.error("friend-messages list", e);
    return NextResponse.json({ error: "Erro ao listar mensagens." }, { status: 500 });
  }
}
