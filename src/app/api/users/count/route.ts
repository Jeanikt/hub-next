import { NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { getUsersCountCache, setUsersCountCache } from "@/src/lib/redis";

/** GET /api/users/count – total de jogadores (público). Cache em Redis (60s) quando disponível. */
export async function GET() {
  try {
    const cached = await getUsersCountCache();
    if (cached !== null) return NextResponse.json({ total: cached });

    const total = await prisma.user.count({ where: { isBanned: false } });
    await setUsersCountCache(total);

    return NextResponse.json({ total });
  } catch (e) {
    serverError("GET /api/users/count", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao obter total." }, { status: 500 });
  }
}
