import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { toSafeUser } from "@/src/types/api";
import { progressToNextLevel } from "@/src/lib/xpLevel";
import { verifyAndCompleteMissions } from "@/src/lib/missions/verify";
import { isUserOnline } from "@/src/lib/online";

/** Limpa ban expirado (bannedUntil no passado) e retorna o usuário atualizado. */
async function clearExpiredBanAndGetUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true, bannedUntil: true, banReason: true },
  });
  if (!user) return null;
  if (user.bannedUntil && new Date(user.bannedUntil) < new Date()) {
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, bannedUntil: null, banReason: null },
    });
    return { isBanned: false, bannedUntil: null };
  }
  return { isBanned: user.isBanned, bannedUntil: user.bannedUntil };
}

const ME_SELECT_FULL = {
  id: true,
  name: true,
  email: true,
  discordId: true,
  username: true,
  bio: true,
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
  profileBackgroundMode: true,
  favoriteChampion: true,
  bestWinrateChampion: true,
  isOnline: true,
  lastLoginAt: true,
} as const;

const ME_SELECT_MINIMAL = {
  id: true,
  name: true,
  email: true,
  discordId: true,
  username: true,
  image: true,
  bio: true,
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
  isOnline: true,
  lastLoginAt: true,
} as const;

/** GET /api/me – retorna o usuário autenticado (SafeUser + campos de perfil e progresso). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  let banStatus: { isBanned: boolean; bannedUntil: Date | null } | null = null;
  try {
    banStatus = await clearExpiredBanAndGetUser(session.user.id);
  } catch {
    // Colunas de ban podem não existir
  }

  let user: {
    id: string;
    name: string | null;
    email: string | null;
    username: string | null;
    image: string | null;
    bio: string | null;
    rank: string | null;
    elo: number;
    xp: number;
    level: number;
    isAdmin: boolean;
    onboardingCompleted: boolean;
    riotId: string | null;
    tagline: string | null;
    primaryRole: string | null;
    secondaryRole: string | null;
    isOnline: boolean;
    lastLoginAt: Date | null;
    profileBackgroundUrl?: string | null;
    profileBackgroundMode?: string | null;
    favoriteChampion?: string | null;
    bestWinrateChampion?: string | null;
  } | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: ME_SELECT_FULL,
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2022") {
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: ME_SELECT_MINIMAL,
      });
      if (user) {
        (user as { profileBackgroundUrl?: null }).profileBackgroundUrl = null;
        (user as { profileBackgroundMode?: null }).profileBackgroundMode = null;
        (user as { favoriteChampion?: null }).favoriteChampion = null;
        (user as { bestWinrateChampion?: null }).bestWinrateChampion = null;
      }
    } else {
      throw e;
    }
  }

  if (!user) {
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  // Heartbeat: mantém usuário como online (atualiza lastLoginAt no máx. a cada 2 min)
  const now = Date.now();
  const lastLogin = user.lastLoginAt ? user.lastLoginAt.getTime() : 0;
  if (now - lastLogin > 120_000) {
    prisma.user.update({
      where: { id: session.user.id },
      data: { lastLoginAt: new Date(), isOnline: true },
    }).catch(() => {});
  }

  // Missões são concluídas automaticamente pelo sistema (eventos reais)
  try {
    await verifyAndCompleteMissions(user.id);
  } catch {
    // não falha o GET /api/me se a verificação der erro
  }

  const progress = progressToNextLevel(user.xp);
  const [friendsCount, likesCount, missionsCompletedCount] = await Promise.all([
    prisma.friend.count({ where: { OR: [{ userId: user.id }, { friendId: user.id }], status: "accepted" } }).catch(() => 0),
    prisma.profileLike.count({ where: { targetUserId: user.id } }).catch(() => 0),
    prisma.userMission.count({ where: { userId: user.id } }).catch(() => 0),
  ]);

  return NextResponse.json({
    ...toSafeUser(user),
    discordId: (user as any).discordId ?? null,
    riotId: user.riotId,
    tagline: user.tagline,
    primaryRole: user.primaryRole,
    secondaryRole: user.secondaryRole,
    profileBackgroundUrl: user.profileBackgroundUrl ?? null,
    profileBackgroundMode: (user as { profileBackgroundMode?: string | null }).profileBackgroundMode ?? null,
    favoriteChampion: user.favoriteChampion ?? null,
    bestWinrateChampion: user.bestWinrateChampion ?? null,
    isOnline: isUserOnline(user.lastLoginAt),
    friendsCount,
    likesCount,
    missionsCompletedCount,
    xpProgress: progress,
    isBanned: banStatus?.isBanned ?? false,
    bannedUntil: banStatus?.bannedUntil ?? null,
    bio: user.bio ?? null
  });
}
