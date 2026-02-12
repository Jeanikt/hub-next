/**
 * Verificação automática de missões: apenas o sistema marca conclusão com base em
 * eventos reais (perfil, partidas, amizades, convites). O usuário não pode marcar manualmente.
 */
import { prisma } from "@/src/lib/prisma";
import { levelFromXp } from "@/src/lib/xpLevel";

const NOW = new Date();
const START_OF_DAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
const START_OF_WEEK = new Date(NOW);
START_OF_WEEK.setDate(START_OF_WEEK.getDate() - START_OF_WEEK.getDay());
START_OF_WEEK.setHours(0, 0, 0, 0);
const START_OF_MONTH = new Date(NOW.getFullYear(), NOW.getMonth(), 1);

/** Verifica critérios e concede missão + XP sem duplicar. */
export async function verifyAndCompleteMissions(userId: string): Promise<{ completed: string[] }> {
  const completed: string[] = [];
  const [user, completedMissions, missions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        riotId: true,
        tagline: true,
        xp: true,
        level: true,
      },
    }),
    prisma.userMission.findMany({ where: { userId }, select: { missionId: true } }),
    prisma.mission.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
  ]);

  if (!user) return { completed };
  const completedSet = new Set(completedMissions.map((c) => c.missionId));

  for (const mission of missions) {
    if (completedSet.has(mission.id)) continue;

    let passed = false;
    switch (mission.title) {
      case "Perfil completo":
        passed =
          !!user.name?.trim() &&
          !!user.username?.trim() &&
          !!user.riotId?.trim() &&
          !!user.tagline?.trim();
        break;
      case "Adicione um amigo": {
        const acceptedCount = await prisma.friend.count({
          where: {
            status: "accepted",
            OR: [{ userId }, { friendId: userId }],
          },
        });
        passed = acceptedCount >= 1;
        break;
      }
      case "Primeira vitória do dia": {
        const winToday = await prisma.gameMatchUser.findFirst({
          where: {
            userId,
            gameMatch: {
              status: "finished",
              finishedAt: { gte: START_OF_DAY },
              winnerTeam: { not: null },
            },
          },
          include: { gameMatch: { select: { winnerTeam: true } } },
        });
        passed =
          !!winToday &&
          winToday.team != null &&
          winToday.gameMatch.winnerTeam === winToday.team;
        break;
      }
      case "Jogador em equipe": {
        const matchWith10 = await prisma.gameMatchUser.findFirst({
          where: {
            userId,
            gameMatch: {
              status: "finished",
              finishedAt: { not: null },
            },
          },
          include: {
            gameMatch: {
              select: { id: true },
              include: { _count: { select: { participants: true } } },
            },
          },
        });
        passed = (matchWith10?.gameMatch._count.participants ?? 0) >= 10;
        break;
      }
      case "3 partidas na semana": {
        const countWeek = await prisma.gameMatchUser.count({
          where: {
            userId,
            gameMatch: {
              status: "finished",
              finishedAt: { gte: START_OF_WEEK },
            },
          },
        });
        passed = countWeek >= 3;
        break;
      }
      case "5 partidas no mês": {
        const countMonth = await prisma.gameMatchUser.count({
          where: {
            userId,
            gameMatch: {
              status: "finished",
              finishedAt: { gte: START_OF_MONTH },
            },
          },
        });
        passed = countMonth >= 5;
        break;
      }
      case "Convide 10 amigos": {
        const referralsCount = await prisma.referral.count({
          where: { inviterId: userId },
        });
        passed = referralsCount >= 10;
        break;
      }
      default:
        continue;
    }

    if (passed) {
      const newXp = user.xp + mission.xpReward;
      const newLevel = levelFromXp(newXp);
      await prisma.$transaction([
        prisma.userMission.create({
          data: { userId, missionId: mission.id },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { xp: newXp, level: newLevel },
        }),
      ]);
      completedSet.add(mission.id);
      completed.push(mission.id);
      (user as { xp: number }).xp = newXp;
      (user as { level: number }).level = newLevel;
    }
  }

  return { completed };
}
