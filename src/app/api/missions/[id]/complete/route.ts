import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { levelFromXp } from "@/src/lib/xpLevel";

type Params = { params: Promise<{ id: string }> };

/** POST /api/missions/[id]/complete – marca missão como concluída e concede XP */
export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const { id: missionId } = await params;
  if (!missionId) {
    return NextResponse.json({ message: "ID da missão inválido." }, { status: 422 });
  }

  const mission = await prisma.mission.findUnique({
    where: { id: missionId, isActive: true },
  });
  if (!mission) {
    return NextResponse.json({ message: "Missão não encontrada ou inativa." }, { status: 404 });
  }

  const existing = await prisma.userMission.findUnique({
    where: { userId_missionId: { userId: session.user.id, missionId } },
  });
  if (existing) {
    return NextResponse.json({ message: "Missão já concluída." }, { status: 409 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { xp: true, level: true },
  });
  if (!user) {
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  const newXp = user.xp + mission.xpReward;
  const newLevel = levelFromXp(newXp);

  await prisma.$transaction([
    prisma.userMission.create({
      data: { userId: session.user.id, missionId },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { xp: newXp, level: newLevel },
    }),
  ]);

  return NextResponse.json({
    success: true,
    xpGained: mission.xpReward,
    totalXp: newXp,
    level: newLevel,
  });
}
