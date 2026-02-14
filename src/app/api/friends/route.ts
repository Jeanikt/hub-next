import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { addFriendSchema } from "@/src/lib/validators/schemas";
import { createNotification } from "@/src/lib/notifications";
import { isUserOnline } from "@/src/lib/online";

/** GET /api/friends – lista amigos e pedidos pendentes */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const [sent, received] = await Promise.all([
      prisma.friend.findMany({
        where: { userId: session.user.id },
        include: {
          friend: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              elo: true,
              isOnline: true,
              lastLoginAt: true,
            },
          },
        },
      }),
      prisma.friend.findMany({
        where: { friendId: session.user.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              elo: true,
              isOnline: true,
              lastLoginAt: true,
            },
          },
        },
      }),
    ]);

    const accepted = [
      ...sent.filter((f) => f.status === "accepted").map((f) => ({ ...f, peer: f.friend, direction: "sent" as const })),
      ...received.filter((f) => f.status === "accepted").map((f) => ({ ...f, peer: f.user, direction: "received" as const })),
    ];
    const pendingSent = sent.filter((f) => f.status === "pending");
    const pendingReceived = received.filter((f) => f.status === "pending");

    return NextResponse.json({
      friends: accepted.map((a) => ({ id: a.peer.id, username: a.peer.username, name: a.peer.name, avatarUrl: (a.peer as { image?: string }).image ?? null, elo: a.peer.elo, isOnline: isUserOnline((a.peer as { lastLoginAt?: Date | null }).lastLoginAt) })),
      pendingSent: pendingSent.map((f) => ({ id: f.id, friend: f.friend })),
      pendingReceived: pendingReceived.map((f) => ({ id: f.id, user: f.user })),
    });
  } catch (e) {
    serverError("GET /api/friends", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao listar amigos." }, { status: 500 });
  }
}

/** POST /api/friends – adicionar amigo (username ou friend_id) */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = addFriendSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? "Envie username ou friend_id.";
      return NextResponse.json({ message: msg }, { status: 422 });
    }

    const { username, friend_id: friendIdParam } = parsed.data;
    let targetId: string;
    if (friendIdParam) {
      const u = await prisma.user.findUnique({ where: { id: friendIdParam } });
      if (!u) {
        return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
      }
      targetId = u.id;
    } else if (username) {
      const u = await prisma.user.findUnique({ where: { username } });
      if (!u) {
        return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
      }
      targetId = u.id;
    } else {
      return NextResponse.json({ message: "Envie username ou friend_id." }, { status: 422 });
    }

    if (targetId === session.user.id) {
      return NextResponse.json({ message: "Você não pode adicionar a si mesmo." }, { status: 422 });
    }

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId: targetId },
          { userId: targetId, friendId: session.user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ message: "Vocês já são amigos." }, { status: 409 });
      }
      if (existing.userId === session.user.id) {
        return NextResponse.json({ message: "Pedido já enviado." }, { status: 409 });
      }
      return NextResponse.json({ message: "Já existe um pedido deste usuário." }, { status: 409 });
    }

    await prisma.friend.create({
      data: {
        userId: session.user.id,
        friendId: targetId,
        status: "pending",
      },
    });

    // Notificar o alvo que recebeu um pedido de amizade
    const senderName = session.user.name ?? session.user.username ?? "Alguém";
    try {
      await createNotification(targetId, {
        type: "friend_request",
        title: "Novo pedido de amizade",
        body: `${senderName} enviou um pedido de amizade.`,
      });
    } catch {
      // não falha a resposta
    }

    return NextResponse.json({ success: true, message: "Pedido de amizade enviado." });
  } catch (e) {
    serverError("GET /api/friends", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao enviar pedido." }, { status: 500 });
  }
}
