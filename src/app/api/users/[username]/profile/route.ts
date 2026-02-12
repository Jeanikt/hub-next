import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getRoleLabel } from "@/src/lib/roles";
import { isUserOnline } from "@/src/lib/online";

type Params = { params: Promise<{ username: string }> };

const PROFILE_SELECT_FULL = {
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
  lastLoginAt: true,
} as const;

const PROFILE_SELECT_MINIMAL = {
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
  isOnline: true,
  lastLoginAt: true,
} as const;

/** GET /api/users/[username]/profile – perfil público com estatísticas */
export async function GET(_request: Request, { params }: Params) {
  const { username } = await params;
  if (!username) {
    return NextResponse.json({ message: "Username é obrigatório." }, { status: 422 });
  }

  let user: Record<string, unknown> | null = null;
  try {
    user = await prisma.user.findUnique({
      where: { username, isBanned: false },
      select: PROFILE_SELECT_FULL,
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2022") {
      user = await prisma.user.findUnique({
        where: { username, isBanned: false },
        select: PROFILE_SELECT_MINIMAL,
      });
      if (user) {
        user.profileBackgroundUrl = null;
        user.favoriteChampion = null;
        user.bestWinrateChampion = null;
      }
    } else {
      throw e;
    }
  }

  if (!user) {
    return NextResponse.json({ message: "Perfil não encontrado." }, { status: 404 });
  }

  const [friendsCount, likesCount, missionsCompletedCount] = await Promise.all([
    prisma.friend.count({
      where: {
        OR: [{ userId: user.id as string }, { friendId: user.id as string }],
        status: "accepted",
      },
    }).catch(() => 0),
    prisma.profileLike.count({ where: { targetUserId: user.id as string } }).catch(() => 0),
    prisma.userMission.count({ where: { userId: user.id as string } }).catch(() => 0),
  ]);

  const { progressToNextLevel } = await import("@/src/lib/xpLevel");
  const xpProgress = progressToNextLevel(user.xp as number);

  const lastLoginAt = user.lastLoginAt as Date | null | undefined;
  const { lastLoginAt: _dropped, ...safeUser } = user as Record<string, unknown> & { lastLoginAt?: unknown };
  return NextResponse.json({
    ...safeUser,
    avatarUrl: user.image,
    isOnline: isUserOnline(lastLoginAt),
    friendsCount,
    likesCount,
    missionsCompletedCount,
    xpProgress,
    primaryRoleLabel: getRoleLabel(user.primaryRole as string | null),
    secondaryRoleLabel: getRoleLabel(user.secondaryRole as string | null),
  });
}
