import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { toSafeUser } from "@/src/types/api";
import { progressToNextLevel } from "@/src/lib/xpLevel";

/** GET /api/me – retorna o usuário autenticado (SafeUser + campos de perfil e progresso). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      image: true,
      rank: true,
      elo: true,
      xp: true,
      level: true,
      isAdmin: true,
      onboardingCompleted: true,
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
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  const progress = progressToNextLevel(user.xp);
  const [friendsCount, likesCount, missionsCompletedCount] = await Promise.all([
    prisma.friend.count({ where: { OR: [{ userId: user.id }, { friendId: user.id }], status: "accepted" } }).catch(() => 0),
    prisma.profileLike.count({ where: { targetUserId: user.id } }).catch(() => 0),
    prisma.userMission.count({ where: { userId: user.id } }).catch(() => 0),
  ]);

  return NextResponse.json({
    ...toSafeUser(user),
    riotId: user.riotId,
    tagline: user.tagline,
    primaryRole: user.primaryRole,
    secondaryRole: user.secondaryRole,
    profileBackgroundUrl: user.profileBackgroundUrl,
    favoriteChampion: user.favoriteChampion,
    bestWinrateChampion: user.bestWinrateChampion,
    isOnline: user.isOnline,
    friendsCount,
    likesCount,
    missionsCompletedCount,
    xpProgress: progress,
  });
}
