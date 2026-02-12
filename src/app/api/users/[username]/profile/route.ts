import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getRoleLabel } from "@/src/lib/roles";

type Params = { params: Promise<{ username: string }> };

/** GET /api/users/[username]/profile – perfil público com estatísticas */
export async function GET(_request: Request, { params }: Params) {
  const { username } = await params;
  if (!username) {
    return NextResponse.json({ message: "Username é obrigatório." }, { status: 422 });
  }

  const user = await prisma.user.findUnique({
    where: { username, isBanned: false },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      elo: true,
      level: true,
      xp: true,
      rank: true,
      riotId: true,
      tagline: true,
      primaryRole: true,
      secondaryRole: true,
      profileBackgroundUrl: true,
      favoriteChampion: true,
      bestWinrateChampion: true,
      isOnline: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "Perfil não encontrado." }, { status: 404 });
  }

  const [friendsCount, likesCount, missionsCompletedCount] = await Promise.all([
    prisma.friend.count({
      where: {
        OR: [{ userId: user.id }, { friendId: user.id }],
        status: "accepted",
      },
    }),
    prisma.profileLike.count({ where: { targetUserId: user.id } }),
    prisma.userMission.count({ where: { userId: user.id } }),
  ]);

  const { progressToNextLevel } = await import("@/src/lib/xpLevel");
  const xpProgress = progressToNextLevel(user.xp);

  return NextResponse.json({
    ...user,
    avatarUrl: user.image,
    friendsCount,
    likesCount,
    missionsCompletedCount,
    xpProgress,
    primaryRoleLabel: getRoleLabel(user.primaryRole),
    secondaryRoleLabel: getRoleLabel(user.secondaryRole),
  });
}
