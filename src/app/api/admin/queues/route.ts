import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";

/** GET /api/admin/queues – status das filas (apenas email admin) */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const types = ["low_elo", "high_elo", "inclusive"] as const;
    const queues = await Promise.all(
      types.map(async (type) => {
        const entries = await prisma.queueEntry.findMany({
          where: { queueType: type },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                elo: true,
                rank: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        });
        return {
          type,
          count: entries.length,
          players_needed: Math.max(0, 10 - entries.length),
          players: entries.map((e) => ({
            id: e.user.id,
            username: e.user.username,
            email: e.user.email,
            elo: e.user.elo,
            rank: e.user.rank,
            joinedAt: e.joinedAt.toISOString(),
          })),
        };
      })
    );

    return NextResponse.json({ data: queues });
  } catch (e) {
    console.error("admin queues", e);
    return NextResponse.json({ error: "Erro ao listar filas." }, { status: 500 });
  }
}
