import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { ONLINE_WINDOW_MS } from "@/src/lib/online";

/**
 * GET /api/presence/heartbeat
 * Marca o usuário autenticado como online (atualiza lastLoginAt e isOnline).
 * Usa raw SQL para atualizar apenas essas colunas e evitar 500 quando o banco
 * ainda não tiver colunas opcionais (ex.: cpfHash).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - ONLINE_WINDOW_MS);

  try {
    await Promise.all([
      prisma.$executeRaw`UPDATE users SET "lastLoginAt" = ${now}, "isOnline" = true WHERE id = ${session.user.id}`,
      prisma.$executeRaw`UPDATE users SET "isOnline" = false WHERE "isOnline" = true AND "lastLoginAt" < ${cutoff}`,
    ]);
  } catch (e) {
    console.error("presence heartbeat", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
