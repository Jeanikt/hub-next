import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { getAccount, VALORANT_RATE_LIMIT_ERROR } from "@/src/lib/valorant";
import { onboardingRiotIdSchema } from "@/src/lib/validators/schemas";
import { verifyAndCompleteMissions } from "@/src/lib/missions/verify";

/**
 * Onboarding Riot: apenas 1 chamada à API (getAccount) para respeitar 30 req/min.
 * Rank e ELO são preenchidos pelo cron sync-elo ou ao editar perfil.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = onboardingRiotIdSchema.safeParse(body);
    if (!parsed.success) {
      const flatten = parsed.error.flatten();
      return NextResponse.json(
        {
          message: flatten.formErrors[0] ?? "Dados inválidos.",
          errors: flatten.fieldErrors as { riotId?: string[]; tagline?: string[] },
        },
        { status: 422 }
      );
    }

    const { riotId, tagline } = parsed.data;
    const riotAccount = `${riotId}#${tagline}`;

    // 1) Verificar se a conta existe na API Riot (nome#tag); 1 chamada para respeitar rate limit
    const accountData = await getAccount(riotId, tagline);
    if (!accountData?.data?.puuid) {
      return NextResponse.json(
        { message: "Conta Riot não encontrada. Verifique o nome e a tag." },
        { status: 422 }
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

    // 3) Salvar vínculo; rank/elo serão preenchidos pelo cron sync-elo (ou ao abrir perfil)
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        riotId,
        tagline,
        riotAccount,
        rank: null,
        elo: 0,
      },
    });

    try {
      await verifyAndCompleteMissions(session.user.id);
    } catch {
      // não falha a resposta
    }

    return NextResponse.json({
      ok: true,
      rank: null,
      elo: 0,
      message: "Conta vinculada. Seu rank será atualizado em breve.",
    });
  } catch (e) {
    if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) {
      return NextResponse.json(
        { message: "Muitos usuários vinculando agora. Tente em 1 minuto." },
        { status: 503 }
      );
    }
    console.error("POST /api/onboarding/riot", e);
    return NextResponse.json(
      { message: "Erro ao vincular conta Riot. Tente novamente." },
      { status: 500 }
    );
  }
}
