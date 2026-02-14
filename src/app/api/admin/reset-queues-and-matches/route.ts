import { NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { clearAllHubCache } from "@/src/lib/redis";

/**
 * POST /api/admin/reset-queues-and-matches
 * Admin only. Zera todas as filas, cancela partidas pendentes/em andamento e apaga todo o cache (Redis hub:*).
 * Use para "começar do zero".
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const [cancelledResult, deletedResult, cacheKeysDeleted] = await Promise.all([
      prisma.gameMatch.updateMany({
        where: { status: { in: ["pending", "in_progress"] } },
        data: { status: "cancelled", finishedAt: new Date() },
      }),
      prisma.queueEntry.deleteMany({}),
      clearAllHubCache(),
    ]);

    return NextResponse.json({
      success: true,
      message: "Filas zeradas, partidas pendentes/em andamento canceladas e cache do sistema apagado.",
      cancelled: cancelledResult.count,
      queuesDeleted: deletedResult.count,
      cacheKeysDeleted,
    });
  } catch (e) {
    serverError("POST /api/admin/reset-queues-and-matches", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { error: "Erro ao zerar filas e cancelar partidas." },
      { status: 500 }
    );
  }
}
