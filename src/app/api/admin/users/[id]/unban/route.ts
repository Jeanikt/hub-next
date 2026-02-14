import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/users/[id]/unban – desbanir (apenas email admin) */
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

    await prisma.user.update({
      where: { id },
      data: {
        isBanned: false,
        bannedUntil: null,
        banReason: null,
      },
    });

    return NextResponse.json({ success: true, message: "Usuário desbanido." });
  } catch (e) {
    serverError("POST /api/admin/users/[id]/unban", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ message: "Erro ao desbanir." }, { status: 500 });
  }
}
