import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { adminBanSchema } from "@/src/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/users/[id]/ban – banir usuário (apenas email admin) */
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
    const bannedUntil = parsed.success && parsed.data.banned_until
      ? new Date(parsed.data.banned_until)
      : permanent ? null : new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 dia

    await prisma.user.update({
      where: { id },
      data: {
        isBanned: true,
        bannedUntil: permanent ? undefined : bannedUntil ?? undefined,
        banReason: reason,
      },
    });

    return NextResponse.json({ success: true, message: "Usuário banido." });
  } catch (e) {
    console.error("admin ban", e);
    return NextResponse.json({ message: "Erro ao banir." }, { status: 500 });
  }
}
