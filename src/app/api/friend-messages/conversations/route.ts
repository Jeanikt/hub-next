import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";

/** GET /api/friend-messages/conversations – conversas recentes (amigos com última mensagem) */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const sent = await prisma.friendMessage.findMany({
      where: { senderId: session.user.id },
      orderBy: { createdAt: "desc" },
      distinct: ["receiverId"],
      take: 30,
      include: { receiver: { select: { id: true, username: true, name: true, image: true } } },
    });
    const received = await prisma.friendMessage.findMany({
      where: { receiverId: session.user.id },
      orderBy: { createdAt: "desc" },
      distinct: ["senderId"],
      take: 30,
      include: { sender: { select: { id: true, username: true, name: true, image: true } } },
    });

    const byPeer = new Map<
      string,
      { peer: { id: string; username: string | null; name: string | null; image: string | null; avatarUrl: string | null }; lastAt: Date; lastContent: string }
    >();
    for (const m of sent) {
      const t = m.createdAt.getTime();
      const peerData = { ...m.receiver, avatarUrl: m.receiver.image ?? null };
      if (!byPeer.has(m.receiverId) || byPeer.get(m.receiverId)!.lastAt.getTime() < t) {
        byPeer.set(m.receiverId, {
          peer: peerData,
          lastAt: m.createdAt,
          lastContent: m.content.slice(0, 80),
        });
      }
    }
    for (const m of received) {
      const t = m.createdAt.getTime();
      const peerData = { ...m.sender, avatarUrl: m.sender.image ?? null };
      if (!byPeer.has(m.senderId) || byPeer.get(m.senderId)!.lastAt.getTime() < t) {
        byPeer.set(m.senderId, {
          peer: peerData,
          lastAt: m.createdAt,
          lastContent: m.content.slice(0, 80),
        });
      }
    }

    const list = Array.from(byPeer.entries())
      .map(([id, v]) => ({ friendId: id, ...v }))
      .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
      .slice(0, 20);

    return NextResponse.json({ conversations: list });
  } catch (e) {
    console.error("friend-messages conversations", e);
    return NextResponse.json({ error: "Erro ao listar conversas." }, { status: 500 });
  }
}
