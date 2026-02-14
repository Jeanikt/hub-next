import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";

/** GET /api/users – listagem pública OU perfil por ?username= */
export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username");
    if (username) {
      const user = await prisma.user.findUnique({
        where: { username, isBanned: false },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          elo: true,
          level: true,
          rank: true,
          riotId: true,
          tagline: true,
          primaryRole: true,
          secondaryRole: true,
          createdAt: true,
        },
      });
      if (!user) {
        return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
      }
      return NextResponse.json({
        id: user.id,
        username: user.username,
        name: user.name,
        avatarUrl: user.image,
        elo: user.elo,
        level: user.level,
        rank: user.rank,
        riotId: user.riotId,
        tagline: user.tagline,
        primaryRole: user.primaryRole,
        secondaryRole: user.secondaryRole,
        createdAt: user.createdAt,
      });
    }

    const search = (request.nextUrl.searchParams.get("search") ?? "").trim();
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10));
    const perPage = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get("per_page") ?? "20", 10)));

    const where = {
      isBanned: false,
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          elo: true,
          level: true,
          profileBadge: true,
          isVerified: true,
        },
        orderBy: { elo: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: data.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        avatarUrl: u.image,
        elo: u.elo,
        level: u.level,
        profileBadge: u.profileBadge,
        isVerified: u.isVerified,
      })),
      total,
      page,
      perPage,
    });
  } catch (e) {
    serverError("GET /api/users", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao listar usuários." }, { status: 500 });
  }
}
