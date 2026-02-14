import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { adminBanSchema, BAN_DURATION_MS } from "@/src/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/users/[id]/ban – banir ou suspender usuário (apenas admin) */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const id = (await params).id;
    if (!id) {
      return NextResponse.json({ message: "ID inválido." }, { status: 422 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
    }
    if (user.isAdmin && user.id !== session.user.id) {
      return NextResponse.json(
        { message: "Não é possível banir outro administrador." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = adminBanSchema.safeParse(body);
    const reason = parsed.success ? parsed.data.reason : "Violação das regras";
    const permanent = parsed.success ? parsed.data.permanent === true : false;
    const durationKey = parsed.success ? parsed.data.duration : undefined;

    let bannedUntil: Date | null = null;
    if (parsed.success && parsed.data.banned_until) {
      bannedUntil = new Date(parsed.data.banned_until);
    } else if (!permanent && durationKey && durationKey in BAN_DURATION_MS) {
      bannedUntil = new Date(Date.now() + BAN_DURATION_MS[durationKey as keyof typeof BAN_DURATION_MS]);
    } else if (!permanent) {
      bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    await prisma.user.update({
      where: { id },
      data: {
        isBanned: true,
        bannedUntil: permanent ? null : bannedUntil ?? undefined,
        banReason: reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: permanent ? "Usuário banido permanentemente." : "Usuário suspenso até a data definida.",
    });
  } catch (e) {
    serverError("POST /api/admin/users/[id]/ban", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao banir." }, { status: 500 });
  }
}
