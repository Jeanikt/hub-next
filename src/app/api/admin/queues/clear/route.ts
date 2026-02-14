import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { invalidateQueueStatusCache } from "@/src/lib/redis";

import { ALL_QUEUE_TYPES } from "@/src/lib/queues";

const VALID_TYPES = ALL_QUEUE_TYPES;

/** POST /api/admin/queues/clear – esvaziar fila(s). Body: { queueType?: "low_elo"|"mid_elo"|"high_elo"|"aberta" } – se omitir, esvazia todas. */
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
    serverError("POST /api/admin/queues/clear", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao esvaziar fila(s)." }, { status: 500 });
  }
}
