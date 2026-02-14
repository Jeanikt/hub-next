import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { levelFromXp } from "@/src/lib/xpLevel";
import {
  XP_PER_REFERRAL,
  REFERRAL_MISSION_TITLE,
  REFERRAL_MISSION_REQUIRED_COUNT,
} from "@/src/lib/inviteCode";

/** POST /api/referrals/attribute – atribui o usuário logado ao código de convite (cookie hub_invite_ref). Concede XP ao inviter e completa missão se atingir 10. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const ref = request.cookies.get("hub_invite_ref")?.value?.trim().toUpperCase();
  if (!ref) {
    return NextResponse.json({ attributed: false }, { status: 200 });
  }

  try {
    const inviter = await prisma.user.findFirst({
      where: { inviteCode: ref },
      select: { id: true, xp: true, level: true },
    });
    if (!inviter || inviter.id === session.user.id) {
      return NextResponse.json({ attributed: false }, { status: 200 });
    }

    const existing = await prisma.referral.findUnique({
      where: { invitedUserId: session.user.id },
    });
    if (existing) {
      return NextResponse.json({ attributed: true, alreadyAttributed: true }, { status: 200 });
    }

    const newXp = inviter.xp + XP_PER_REFERRAL;
    const newLevel = levelFromXp(newXp);

    const mission = await prisma.mission.findFirst({
      where: { title: REFERRAL_MISSION_TITLE, isActive: true },
    });

    const refCountAfter = await prisma.referral.count({
      where: { inviterId: inviter.id },
    });
    const willReach10 = refCountAfter + 1 >= REFERRAL_MISSION_REQUIRED_COUNT;

    await prisma.$transaction(async (tx) => {
      await tx.referral.create({
        data: {
          inviterId: inviter.id,
          invitedUserId: session.user.id,
          inviteCode: ref,
        },
      });
      await tx.user.update({
        where: { id: inviter.id },
        data: { xp: newXp, level: newLevel },
      });
      if (mission && willReach10) {
        const inviterWithMission = await tx.user.findUnique({
          where: { id: inviter.id },
          select: { xp: true },
        });
        const alreadyCompleted = await tx.userMission.findUnique({
          where: { userId_missionId: { userId: inviter.id, missionId: mission.id } },
        });
        if (!alreadyCompleted && inviterWithMission) {
          const bonusXp = inviterWithMission.xp + mission.xpReward;
          const bonusLevel = levelFromXp(bonusXp);
          await tx.userMission.create({
            data: { userId: inviter.id, missionId: mission.id },
          });
          await tx.user.update({
            where: { id: inviter.id },
            data: { xp: bonusXp, level: bonusLevel },
          });
        }
      }
    });

    const res = NextResponse.json({
      attributed: true,
      xpToInviter: XP_PER_REFERRAL,
      missionCompleted: !!mission && willReach10,
    });
    res.cookies.set("hub_invite_ref", "", { maxAge: 0, path: "/" });
    return res;
  } catch (e) {
    serverError("POST /api/referrals/attribute", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao atribuir convite." }, { status: 500 });
  }
}
