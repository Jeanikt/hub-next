import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";

type MatchStats = { total: number; wins: number; kills: number; deaths: number; assists: number };

async function getLeaderboardStats(): Promise<Map<string, MatchStats>> {
  const rows = await prisma.$queryRaw<Array<{ userId: string; total: number; wins: number; kills: number; deaths: number; assists: number }>>`
    SELECT gmu."userId",
      COUNT(*)::int AS total,
      SUM(CASE WHEN gmu.team = gm."winnerTeam" THEN 1 ELSE 0 END)::int AS wins,
      COALESCE(SUM(gmu.kills), 0)::int AS kills,
      COALESCE(SUM(gmu.deaths), 0)::int AS deaths,
      COALESCE(SUM(gmu.assists), 0)::int AS assists
    FROM game_match_user gmu
    INNER JOIN game_matches gm ON gm.id = gmu."gameMatchId"
    WHERE gm.status = 'finished'
    GROUP BY gmu."userId"
  `;
  const map = new Map<string, MatchStats>();
  for (const r of rows) {
    map.set(r.userId, {
      total: Number(r.total),
      wins: Number(r.wins),
      kills: Number(r.kills),
      deaths: Number(r.deaths),
      assists: Number(r.assists),
    });
  }
  return map;
}

/** GET /api/leaderboard – ranking por HEX - Hub Expresso Rating (público) */
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
        hex: true,
        elo: true,
        xp: true,
        level: true,
        rank: true,
      },
      orderBy: [{ hex: "desc" }, { xp: "desc" }],
      skip: offset,
      take: limit,
    });

    const stats = await getLeaderboardStats();

    return NextResponse.json({
      data: users.map((u) => {
        const s = stats.get(u.id);
        const total = s?.total ?? 0;
        const wins = s?.wins ?? 0;
        const winrate = total > 0 ? (wins / total) * 100 : 0;
        const kda = s ? `${s.kills}/${s.deaths}/${s.assists}` : "—";
        return {
          id: u.id,
          username: u.username,
          name: u.name,
          avatarUrl: u.image,
          hex: u.hex ?? 0,
          elo: u.elo,
          xp: u.xp ?? 0,
          level: u.level,
          rank: u.rank,
          winrate: total > 0 ? Math.round(winrate * 10) / 10 : 0,
          totalMatches: total,
          kda,
        };
      }),
      limit,
      offset,
    });
  } catch (e) {
    serverError("GET /api/leaderboard", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao carregar ranking." }, { status: 500 });
  }
}
