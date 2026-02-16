import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";

/** POST /api/queue/decline-duo-invite – recusa convite. Body: { inviteId: number } */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const inviteId = typeof body.inviteId === "number" ? body.inviteId : null;
    if (inviteId == null) {
      return NextResponse.json({ message: "inviteId inválido." }, { status: 422 });
    }
    const invite = await prisma.queueDuoInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.toUserId !== session.user.id || invite.status !== "pending") {
      return NextResponse.json({ message: "Convite não encontrado." }, { status: 404 });
    }
    await prisma.queueDuoInvite.update({
      where: { id: inviteId },
      data: { status: "declined" },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Erro ao recusar." }, { status: 500 });
  }
}
