import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { getAccount, getMMR, getRankLabelFromMMR, VALORANT_RATE_LIMIT_ERROR } from "@/src/lib/valorant";
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

  // Alteração de conta Riot: dois campos (nome e tag); no back verificamos como nome#tag
  if (data.riotId !== undefined && data.tagline !== undefined) {
    const riotIdRaw = data.riotId?.trim() || null;
    const taglineRaw = data.tagline?.trim() || null;

    if (!riotIdRaw && !taglineRaw) {
      updateData.riotId = null;
      updateData.tagline = null;
      updateData.riotAccount = null;
      updateData.rank = null;
      updateData.elo = 0;
    } else if (riotIdRaw && taglineRaw) {
      if (riotIdRaw.length < 2 || taglineRaw.length < 2) {
        return NextResponse.json(
          { message: "Nome e tag devem ter pelo menos 2 caracteres cada." },
          { status: 422 }
        );
      }
      const riotAccount = `${riotIdRaw}#${taglineRaw}`;

      try {
        const accountData = await getAccount(riotIdRaw, taglineRaw);
        if (!accountData?.data?.puuid) {
          return NextResponse.json(
            { message: "Conta Riot não encontrada. Verifique o nome e a tag." },
            { status: 422 }
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
        const mmrData = await getMMR(riotIdRaw, taglineRaw);
        const rankLabel = getRankLabelFromMMR(mmrData);
        const rankPoints = rankLabel != null ? getRankPointsFromTier(rankLabel) : 0;

        updateData.riotId = riotIdRaw;
        updateData.tagline = taglineRaw;
        updateData.riotAccount = riotAccount;
        updateData.rank = rankLabel;
        updateData.elo = rankPoints;
      } catch (e) {
        if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) {
          return NextResponse.json(
            { message: "Muitos acessos à API Riot. Tente em 1 minuto." },
            { status: 503 }
          );
        }
        throw e;
      }
    } else if (riotIdRaw || taglineRaw) {
      return NextResponse.json(
        { message: "Preencha nome e tag do Riot ID para vincular." },
        { status: 422 }
      );
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
