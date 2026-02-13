import { NextResponse } from "next/server";
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
    console.error("users count", e);
    return NextResponse.json({ error: "Erro ao obter total." }, { status: 500 });
  }
}
