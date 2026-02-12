import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { getAccount, getMMR } from "@/src/lib/valorant";
import { getRankPointsFromTier } from "@/src/lib/rankPoints";
import { onboardingRiotIdSchema } from "@/src/lib/validators/schemas";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = onboardingRiotIdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.flatten().formErrors[0] ?? "Dados inválidos." },
      { status: 422 }
    );
  }

  const { riotId, tagline } = parsed.data;
  const riotAccount = `${riotId}#${tagline}`;

  // 1) Verificar se a conta existe na API Riot
  const accountData = await getAccount(riotId, tagline);
  if (!accountData?.data?.puuid) {
    return NextResponse.json(
      { message: "Conta Riot não encontrada. Verifique o nome e a tag." },
      { status: 404 }
    );
  }

  // 2) Verificar se já está em uso por outro usuário
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

  // 3) Buscar rank/MMR e converter para pontos (elo GC 0–20)
  const mmrData = await getMMR(riotId, tagline);
  const currentData = mmrData?.data?.current_data;
  const rankLabel = currentData?.currenttier_patched ?? null;
  const rankPoints = rankLabel != null ? getRankPointsFromTier(rankLabel) : 0;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      riotId,
      tagline,
      riotAccount,
      rank: rankLabel,
      elo: rankPoints,
    },
  });

  return NextResponse.json({
    ok: true,
    rank: rankLabel,
    elo: rankPoints,
  });
}
