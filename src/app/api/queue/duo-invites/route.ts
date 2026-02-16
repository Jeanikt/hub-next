import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { serverError } from "@/src/lib/serverLog";

/** GET /api/queue/duo-invites – lista convites pendentes de fila em duo para o usuário atual */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const invites = await prisma.queueDuoInvite.findMany({
      where: { toUserId: session.user.id, status: "pending" },
      include: {
        fromUser: {
          select: { id: true, username: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      invites: invites.map((i) => ({
        id: i.id,
        queueType: i.queueType,
        fromUser: {
          id: i.fromUser.id,
          username: i.fromUser.username,
          name: i.fromUser.name,
          image: i.fromUser.image,
        },
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    serverError("GET /api/queue/duo-invites", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao listar convites." }, { status: 500 });
  }
}
