import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { getAccount, getMMR } from "@/src/lib/valorant";
import { getRankPointsFromTier } from "@/src/lib/rankPoints";
import { verifyAndCompleteMissions } from "@/src/lib/missions/verify";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  riotId: z.string().max(100).optional().nullable(),
  tagline: z.string().max(10).optional().nullable(),
  primaryRole: z.enum(["controller", "duelist", "initiator", "sentinel"]).optional().nullable(),
  secondaryRole: z.enum(["controller", "duelist", "initiator", "sentinel"]).optional().nullable(),
  profileBackgroundUrl: z.string().url().max(2000).optional().nullable(),
  favoriteChampion: z.string().max(80).optional().nullable(),
  image: z.union([z.string().url().max(2000), z.string().startsWith("/uploads/").max(2000)]).optional().nullable(),
});

/** PATCH /api/profile – atualizar perfil (nome, username, Riot ID). Ao vincular Riot: valida na API, verifica duplicado e atualiza rank/elo. */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados inválidos.", errors: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;

  if (data.username) {
    const existing = await prisma.user.findFirst({
      where: { username: data.username, id: { not: session.user.id } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ message: "Este username já está em uso." }, { status: 409 });
    }
  }

  const updateData: {
    name?: string;
    username?: string;
    riotId?: string | null;
    tagline?: string | null;
    riotAccount?: string | null;
    rank?: string | null;
    elo?: number;
    primaryRole?: string | null;
    secondaryRole?: string | null;
    profileBackgroundUrl?: string | null;
    favoriteChampion?: string | null;
    image?: string | null;
  } = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.username !== undefined && { username: data.username }),
    ...(data.primaryRole !== undefined && { primaryRole: data.primaryRole }),
    ...(data.secondaryRole !== undefined && { secondaryRole: data.secondaryRole }),
    ...(data.profileBackgroundUrl !== undefined && { profileBackgroundUrl: data.profileBackgroundUrl }),
    ...(data.favoriteChampion !== undefined && { favoriteChampion: data.favoriteChampion }),
    ...(data.image !== undefined && { image: data.image }),
  };

  // Alteração de conta Riot
  if (data.riotId !== undefined && data.tagline !== undefined) {
    const riotId = data.riotId?.trim() || null;
    const tagline = data.tagline?.trim() || null;

    if (riotId == null || tagline == null || !riotId || !tagline) {
      updateData.riotId = null;
      updateData.tagline = null;
      updateData.riotAccount = null;
      updateData.rank = null;
      updateData.elo = 0;
    } else {
      const riotAccount = `${riotId}#${tagline}`;

      const accountData = await getAccount(riotId, tagline);
      if (!accountData?.data?.puuid) {
        return NextResponse.json(
          { message: "Conta Riot não encontrada. Verifique o nome e a tag." },
          { status: 404 }
        );
      }

      const existing = await prisma.user.findFirst({
        where: {
          riotAccount,
          id: { not: session.user.id },
        },
      });
      if (existing) {
        return NextResponse.json(
          { message: "Esta conta Riot já está vinculada a outro usuário." },
          { status: 409 }
        );
      }

      // Pontos (0–20) baseados no ELO/rank retornado pela API Riot
      const mmrData = await getMMR(riotId, tagline);
      const currentData = mmrData?.data?.current_data;
      const rankLabel = currentData?.currenttier_patched ?? null;
      const rankPoints = rankLabel != null ? getRankPointsFromTier(rankLabel) : 0;

      updateData.riotId = riotId;
      updateData.tagline = tagline;
      updateData.riotAccount = riotAccount;
      updateData.rank = rankLabel;
      updateData.elo = rankPoints;
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      riotId: true,
      tagline: true,
      rank: true,
      elo: true,
      level: true,
      primaryRole: true,
      secondaryRole: true,
      profileBackgroundUrl: true,
      favoriteChampion: true,
    },
  });

  try {
    await verifyAndCompleteMissions(session.user.id);
  } catch {
    // não falha a resposta do perfil
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    username: user.username,
    avatarUrl: user.image,
    riotId: user.riotId,
    tagline: user.tagline,
    rank: user.rank,
    elo: user.elo,
    level: user.level,
    primaryRole: user.primaryRole,
    secondaryRole: user.secondaryRole,
    profileBackgroundUrl: user.profileBackgroundUrl,
    favoriteChampion: user.favoriteChampion,
  });
}
