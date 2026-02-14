import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { friendAcceptRejectSchema } from "@/src/lib/validators/schemas";

/** POST /api/friends/reject – rejeitar pedido */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = friendAcceptRejectSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? "friend_id ou id é obrigatório.";
      return NextResponse.json({ message: msg }, { status: 422 });
    }
    const id = parsed.data.friend_id ?? parsed.data.id;
    if (id == null) {
      return NextResponse.json({ message: "friend_id ou id é obrigatório." }, { status: 422 });
    }

    const friend = await prisma.friend.findFirst({
      where: { id, friendId: session.user.id, status: "pending" },
    });

    if (!friend) {
      return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
    }

    await prisma.friend.update({
      where: { id: friend.id },
      data: { status: "rejected" },
    });

    return NextResponse.json({ success: true, message: "Pedido rejeitado." });
  } catch (e) {
    serverError("POST /api/friends/reject", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao rejeitar." }, { status: 500 });
  }
}
