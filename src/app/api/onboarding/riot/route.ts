import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { getAccount, VALORANT_RATE_LIMIT_ERROR } from "@/src/lib/valorant";
import { onboardingRiotIdSchema } from "@/src/lib/validators/schemas";
import { verifyAndCompleteMissions } from "@/src/lib/missions/verify";
import { syncEloForUser } from "@/src/lib/syncEloIndividual";


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

    // 1) valida existência (1 chamada)
    const accountData = await getAccount(riotId, tagline);
    if (!accountData?.data?.puuid) {
      return NextResponse.json(
        { message: "Conta não encontrada. Verifique o nome e a tag." },
        { status: 422 }
      );
    }

    // 2) checar se já está em uso
    const existing = await prisma.user.findFirst({
      where: { riotAccount, id: { not: session.user.id } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Esta conta já está vinculada a outro usuário." },
        { status: 409 }
      );
    }

    // 3) salva o básico
    await prisma.user.update({
      where: { id: session.user.id },
      data: { riotId, tagline, riotAccount, rank: null, elo: 0 },
    });

    // 4) sync de rank/elo AGORA (garantido)
    const sync = await syncEloForUser(riotId, tagline, session.user.id);

    // 5) missões (não precisa bloquear)
    try {
      await verifyAndCompleteMissions(session.user.id);
    } catch {}

    if (!sync.ok) {
      if (sync.reason === "many_requests" || sync.reason === VALORANT_RATE_LIMIT_ERROR) {
        return NextResponse.json(
          { message: "Muitos usuários vinculando agora. Tente novamente em 1 minuto." },
          { status: 503 }
        );
      }

      // vinculou, mas não conseguiu sincronizar agora
      return NextResponse.json({
        ok: true,
        rank: null,
        elo: 0,
        message: "Conta vinculada. Seu rank será atualizado em breve.",
      });
    }

    return NextResponse.json({
      ok: true,
      rank: sync.rank,
      elo: sync.elo,
      message: "Conta vinculada e rank atualizado.",
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
      { message: "Erro ao vincular conta. Tente novamente." },
      { status: 500 }
    );
  }
}
