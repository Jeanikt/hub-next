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

    const offset = (page - 1) * perPage;

    // Build queries with custom badge ordering
    let data: Array<{
      id: string;
      username: string | null;
      name: string | null;
      image: string | null;
      elo: number;
      level: number;
      profileBadge: string | null;
      isVerified: boolean;
    }>;
    let total: number;

    if (search) {
      const searchPattern = `%${search}%`;
      const [dataResult, countResult] = await Promise.all([
        prisma.$queryRawUnsafe<
          Array<{
            id: string;
            username: string | null;
            name: string | null;
            image: string | null;
            elo: number;
            level: number;
            profileBadge: string | null;
            isVerified: boolean;
          }>
        >(
          `
            SELECT id, username, name, image, elo, level, "profileBadge", "isVerified"
            FROM "users"
            WHERE "isBanned" = false AND ("username" ILIKE $1 OR "name" ILIKE $2)
            ORDER BY 
              CASE
                WHEN "profileBadge" = 'dev' THEN 1
                WHEN "profileBadge" = 'admin' THEN 2
                WHEN "profileBadge" = 'mod' THEN 3
                WHEN "profileBadge" = 'pro' THEN 4
                WHEN "profileBadge" = 'streamer' THEN 5
                WHEN "profileBadge" = 'coach' THEN 6
                WHEN "profileBadge" IS NULL AND "isVerified" = true THEN 7
                ELSE 8
              END,
              elo DESC,
              id ASC
            LIMIT $3 OFFSET $4
          `,
          searchPattern,
          searchPattern,
          perPage,
          offset
        ),
        prisma.$queryRawUnsafe<Array<{ total: number | bigint }>>(
          `SELECT COUNT(*) as total FROM "users" WHERE "isBanned" = false AND ("username" ILIKE $1 OR "name" ILIKE $2)`,
          searchPattern,
          searchPattern
        ),
      ]);
      data = dataResult;
      total = Number(countResult[0].total);
    } else {
      const [dataResult, countResult] = await Promise.all([
        prisma.$queryRawUnsafe<
          Array<{
            id: string;
            username: string | null;
            name: string | null;
            image: string | null;
            elo: number;
            level: number;
            profileBadge: string | null;
            isVerified: boolean;
          }>
        >(
          `
            SELECT id, username, name, image, elo, level, "profileBadge", "isVerified"
            FROM "users"
            WHERE "isBanned" = false
            ORDER BY 
              CASE
                WHEN "profileBadge" = 'dev' THEN 1
                WHEN "profileBadge" = 'admin' THEN 2
                WHEN "profileBadge" = 'mod' THEN 3
                WHEN "profileBadge" = 'pro' THEN 4
                WHEN "profileBadge" = 'streamer' THEN 5
                WHEN "profileBadge" = 'coach' THEN 6
                WHEN "profileBadge" IS NULL AND "isVerified" = true THEN 7
                ELSE 8
              END,
              elo DESC,
              id ASC
            LIMIT $1 OFFSET $2
          `,
          perPage,
          offset
        ),
        prisma.$queryRawUnsafe<Array<{ total: number | bigint }>>(
          `SELECT COUNT(*) as total FROM "users" WHERE "isBanned" = false`
        ),
      ]);
      data = dataResult;
      total = Number(countResult[0].total);
    }

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
    console.log(e)
    return NextResponse.json({ error: "Erro ao listar usuários." }, { status: 500 });
  }
}
