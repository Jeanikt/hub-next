import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { isUserOnline } from "@/src/lib/online";

/** GET /api/admin/users – listar usuários (apenas email admin permitido) */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const search = request.nextUrl.searchParams.get("search") ?? "";
    const banned = request.nextUrl.searchParams.get("banned"); // yes | no
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10));
    const perPage = 20;

    const and: Prisma.UserWhereInput[] = [];
    if (search.trim()) {
      and.push({
        OR: [
          { name: { contains: search.trim() } },
          { username: { contains: search.trim() } },
          { email: { contains: search.trim() } },
        ],
      });
    }
    if (banned === "yes") {
      and.push({
        OR: [{ isBanned: true }, { bannedUntil: { not: null } }],
      });
    } else if (banned === "no") {
      and.push({ isBanned: false, bannedUntil: null });
    }
    const where = and.length > 0 ? { AND: and } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          image: true,
          elo: true,
          rank: true,
          riotId: true,
          tagline: true,
          isOnline: true,
          lastLoginAt: true,
          isBanned: true,
          bannedUntil: true,
          banReason: true,
          createdAt: true,
          profileBadge: true,
          isVerified: true,
          isAdmin: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users.map(({ image, lastLoginAt, ...u }) => ({
        ...u,
        avatarUrl: image ?? null,
        isOnline: isUserOnline(lastLoginAt),
      })),
      total,
      page,
      perPage,
    });
  } catch (e) {
    serverError("GET /api/admin/users", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao listar usuários." }, { status: 500 });
  }
}
