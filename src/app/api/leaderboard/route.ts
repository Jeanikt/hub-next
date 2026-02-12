import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

/** GET /api/leaderboard – ranking por ELO (público, sempre atualizado) */
export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10)));
    const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10));

    const users = await prisma.user.findMany({
      where: {
        username: { not: null },
        isBanned: false,
        onboardingCompleted: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        elo: true,
        level: true,
        rank: true,
      },
      orderBy: { elo: "desc" },
      skip: offset,
      take: limit,
    });

    return NextResponse.json({
      data: users.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        avatarUrl: u.image,
        elo: u.elo,
        level: u.level,
        rank: u.rank,
      })),
      limit,
      offset,
    });
  } catch (e) {
    console.error("leaderboard", e);
    return NextResponse.json({ error: "Erro ao carregar ranking." }, { status: 500 });
  }
}
