import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { invalidateQueueStatusCache } from "@/src/lib/redis";

/**
 * POST /api/admin/reset-queues-and-matches
 * Admin only. Cancela todas as partidas pendentes ou em andamento e esvazia todas as filas.
 * Use para "começar do zero".
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const [cancelledResult, deletedResult] = await Promise.all([
      prisma.gameMatch.updateMany({
        where: { status: { in: ["pending", "in_progress"] } },
        data: { status: "cancelled", finishedAt: new Date() },
      }),
      prisma.queueEntry.deleteMany({}),
    ]);

    await invalidateQueueStatusCache();

    return NextResponse.json({
      success: true,
      message: "Filas zeradas e partidas pendentes/em andamento canceladas.",
      cancelled: cancelledResult.count,
      queuesDeleted: deletedResult.count,
    });
  } catch (e) {
    console.error("admin reset-queues-and-matches", e);
    return NextResponse.json(
      { error: "Erro ao zerar filas e cancelar partidas." },
      { status: 500 }
    );
  }
}
