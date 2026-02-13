import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { prisma } from "@/src/lib/prisma";

/** GET /api/admin/missions – lista todas as missões (ativas e inativas). Apenas admin. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    const missions = await prisma.mission.findMany({
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        xpReward: true,
        isActive: true,
        createdAt: true,
        _count: { select: { completions: true } },
      },
    });
    return NextResponse.json({
      data: missions.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        type: m.type,
        xpReward: m.xpReward,
        isActive: m.isActive,
        createdAt: m.createdAt,
        completionsCount: m._count.completions,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao listar missões." }, { status: 500 });
  }
}
