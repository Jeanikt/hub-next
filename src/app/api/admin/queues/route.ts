import { NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
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

    const { ALL_QUEUE_TYPES, getPlayersRequired } = await import("@/src/lib/queues");
    const types = ALL_QUEUE_TYPES;
    const playersNeededByType: Record<string, number> = {};
    for (const t of types) playersNeededByType[t] = getPlayersRequired(t);
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
        const needed = playersNeededByType[type] ?? 10;
        return {
          type,
          count: entries.length,
          max_players: needed,
          players_needed: Math.max(0, needed - entries.length),
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
    serverError("GET /api/admin/queues", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao listar filas." }, { status: 500 });
  }
}
