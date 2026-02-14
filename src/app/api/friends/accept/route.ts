import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { friendAcceptRejectSchema } from "@/src/lib/validators/schemas";
import { verifyAndCompleteMissions } from "@/src/lib/missions/verify";
import { createNotification } from "@/src/lib/notifications";

/** POST /api/friends/accept – aceitar pedido (body: friend_id = id do registro Friend) */
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
      return NextResponse.json({ message: "Pedido não encontrado ou já processado." }, { status: 404 });
    }

    await prisma.friend.update({
      where: { id: friend.id },
      data: { status: "accepted" },
    });

    // Quem enviou o pedido pode ter missão "Adicione um amigo" concluída automaticamente
    try {
      await verifyAndCompleteMissions(friend.userId);
    } catch {
      // não falha a resposta
    }

    // Notificar quem enviou o pedido que foi aceito
    const acceptorName = session.user.name ?? session.user.username ?? "Alguém";
    try {
      await createNotification(friend.userId, {
        type: "friend_accepted",
        title: "Pedido de amizade aceito",
        body: `${acceptorName} aceitou seu pedido de amizade.`,
      });
    } catch {
      // não falha a resposta
    }

    return NextResponse.json({ success: true, message: "Pedido aceito." });
  } catch (e) {
    serverError("POST /api/friends/accept", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao aceitar." }, { status: 500 });
  }
}
