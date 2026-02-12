import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

/** GET /api/notifications – listar notificações do usuário (mais recentes primeiro) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const list = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      readAt: true,
      createdAt: true,
    },
  });

  const data = list.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }));

  return NextResponse.json({ data });
}
