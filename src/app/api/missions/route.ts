import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

/** GET /api/missions – lista missões ativas com status de conclusão do usuário */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const missions = await prisma.mission.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  let completedIds: string[] = [];
  if (userId) {
    const completed = await prisma.userMission.findMany({
      where: { userId },
      select: { missionId: true },
    });
    completedIds = completed.map((c) => c.missionId);
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
}
