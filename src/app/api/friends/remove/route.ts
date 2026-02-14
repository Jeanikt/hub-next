import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { removeFriendSchema } from "@/src/lib/validators/schemas";

/** POST /api/friends/remove – remover amizade (body: friend_id = userId do amigo) */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = removeFriendSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? "friend_id é obrigatório.";
      return NextResponse.json({ message: msg }, { status: 422 });
    }
    const friendId = parsed.data.friend_id;

    const deleted = await prisma.friend.deleteMany({
      where: {
        status: "accepted",
        OR: [
          { userId: session.user.id, friendId },
          { userId: friendId, friendId: session.user.id },
        ],
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ message: "Amizade não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Amizade removida." });
  } catch (e) {
    serverError("POST /api/friends/remove", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao remover." }, { status: 500 });
  }
}
