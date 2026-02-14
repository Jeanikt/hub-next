import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { invalidateQueueStatusCache } from "@/src/lib/redis";

const VALID_TYPES = ["low_elo", "high_elo", "inclusive", "secret"] as const;

/** POST /api/admin/queues/clear – esvaziar fila(s). Body: { queueType?: "low_elo"|"high_elo"|"inclusive" } – se omitir, esvazia todas. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const queueType = body.queueType as string | undefined;
    const where = queueType && VALID_TYPES.includes(queueType as (typeof VALID_TYPES)[number])
      ? { queueType }
      : {};
    const deleted = await prisma.queueEntry.deleteMany({ where });
    await invalidateQueueStatusCache();
    return NextResponse.json({
      message: queueType ? `Fila ${queueType} esvaziada.` : "Todas as filas esvaziadas.",
      deleted: deleted.count,
    });
  } catch (e) {
    console.error("admin queues clear", e);
    return NextResponse.json({ error: "Erro ao esvaziar fila(s)." }, { status: 500 });
  }
}
