import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { markReadFriendSchema } from "@/src/lib/validators/schemas";

/** POST /api/friend-messages/mark-read – marcar mensagens de um amigo como lidas (body: friend_id) */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = markReadFriendSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? "friend_id é obrigatório.";
      return NextResponse.json({ message: msg }, { status: 422 });
    }
    const friendId = parsed.data.friend_id;

    await prisma.friendMessage.updateMany({
      where: {
        receiverId: session.user.id,
        senderId: friendId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("friend-messages mark-read", e);
    return NextResponse.json({ message: "Erro ao marcar como lida." }, { status: 500 });
  }
}
