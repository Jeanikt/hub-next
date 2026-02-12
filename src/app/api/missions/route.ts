import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

/** GET /api/missions – lista missões ativas com status de conclusão do usuário */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    const missions = await prisma.mission.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    });

    let completedIds: string[] = [];
    if (userId) {
      try {
        const completed = await prisma.userMission.findMany({
          where: { userId },
          select: { missionId: true },
        });
        completedIds = completed.map((c) => c.missionId);
      } catch {
        // Tabela user_missions pode não existir
      }
    }

    const list = missions.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type,
      xpReward: m.xpReward,
      completed: completedIds.includes(m.id),
    }));

    return NextResponse.json({ data: list });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2021") {
      return NextResponse.json({ data: [] });
    }
    throw e;
  }
}
