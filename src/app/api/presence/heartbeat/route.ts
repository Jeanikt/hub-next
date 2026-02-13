import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { ONLINE_WINDOW_MS } from "@/src/lib/online";

/**
 * GET /api/presence/heartbeat
 * Marca o usuário autenticado como online (atualiza lastLoginAt e isOnline).
 * Chamado periodicamente pelo frontend enquanto o usuário está na plataforma.
 * Também marca como offline usuários inativos há mais que ONLINE_WINDOW_MS.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - ONLINE_WINDOW_MS);

  await Promise.all([
    prisma.user.update({
      where: { id: session.user.id },
      data: { lastLoginAt: now, isOnline: true },
    }),
    prisma.user.updateMany({
      where: {
        isOnline: true,
        lastLoginAt: { lt: cutoff },
      },
      data: { isOnline: false },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
