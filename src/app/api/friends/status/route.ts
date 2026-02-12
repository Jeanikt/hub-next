import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";

/** GET /api/friends/status?username=xxx – relação com o usuário: none | pending_sent | pending_received | friends */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const username = request.nextUrl.searchParams.get("username");
  if (!username?.trim()) {
    return NextResponse.json({ message: "username é obrigatório." }, { status: 422 });
  }

  const target = await prisma.user.findUnique({
    where: { username: username.trim() },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  if (target.id === session.user.id) {
    return NextResponse.json({ status: "own" as const, message: "Seu perfil." });
  }

  const link = await prisma.friend.findFirst({
    where: {
      OR: [
        { userId: session.user.id, friendId: target.id },
        { userId: target.id, friendId: session.user.id },
      ],
    },
    select: { id: true, status: true, userId: true },
  });

  if (!link) {
    return NextResponse.json({ status: "none" as const });
  }
  if (link.status === "accepted") {
    return NextResponse.json({ status: "friends" as const, friendRecordId: link.id });
  }
  if (link.userId === session.user.id) {
    return NextResponse.json({ status: "pending_sent" as const, friendRecordId: link.id });
  }
  return NextResponse.json({ status: "pending_received" as const, friendRecordId: link.id });
}
