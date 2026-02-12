import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

/** POST /api/profile/like – curte ou descurte um perfil (targetUserId no body) */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const targetUserId = body.targetUserId ?? body.target_user_id;
  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json({ message: "targetUserId é obrigatório." }, { status: 422 });
  }

  if (targetUserId === session.user.id) {
    return NextResponse.json({ message: "Você não pode curtir o próprio perfil." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ message: "Perfil não encontrado." }, { status: 404 });
  }

  const existing = await prisma.profileLike.findUnique({
    where: { userId_targetUserId: { userId: session.user.id, targetUserId } },
  });

  if (existing) {
    await prisma.profileLike.delete({
      where: { userId_targetUserId: { userId: session.user.id, targetUserId } },
    });
    const count = await prisma.profileLike.count({ where: { targetUserId } });
    return NextResponse.json({ liked: false, likesCount: count });
  }

  await prisma.profileLike.create({
    data: { userId: session.user.id, targetUserId },
  });
  const count = await prisma.profileLike.count({ where: { targetUserId } });
  return NextResponse.json({ liked: true, likesCount: count });
}

/** GET /api/profile/like?targetUserId= – verifica se o usuário logado curtiu o perfil */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ liked: false }, { status: 200 });
  }

  const targetUserId = request.nextUrl.searchParams.get("targetUserId");
  if (!targetUserId) {
    return NextResponse.json({ liked: false }, { status: 200 });
  }

  const like = await prisma.profileLike.findUnique({
    where: { userId_targetUserId: { userId: session.user.id, targetUserId } },
  });
  return NextResponse.json({ liked: !!like });
}
