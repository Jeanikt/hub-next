import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { ONLINE_WINDOW_MS } from "@/src/lib/online";

/** GET /api/admin/dashboard – estatísticas (apenas email admin permitido) */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const since = new Date(Date.now() - ONLINE_WINDOW_MS);
    const [usersTotal, usersOnline, matchesToday, bannedTotal] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: since } } }),
      prisma.gameMatch.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.user.count({
        where: {
          OR: [{ isBanned: true }, { bannedUntil: { not: null } }],
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        users_total: usersTotal,
        users_online: usersOnline,
        matches_today: matchesToday,
        banned_total: bannedTotal,
      },
    });
  } catch (e) {
    console.error("admin dashboard", e);
    return NextResponse.json({ error: "Erro ao carregar dashboard." }, { status: 500 });
  }
}
