import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { prisma } from "@/src/lib/prisma";

/** PATCH /api/admin/missions/[id] – ativa/desativa missão. Body: { isActive: boolean }. Apenas admin. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const isActive = body.isActive;
    if (typeof isActive !== "boolean") {
      return NextResponse.json({ message: "isActive (boolean) é obrigatório." }, { status: 422 });
    }
    const mission = await prisma.mission.update({
      where: { id },
      data: { isActive },
      select: { id: true, title: true, isActive: true },
    });
    return NextResponse.json(mission);
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "P2025") {
      return NextResponse.json({ message: "Missão não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar missão." }, { status: 500 });
  }
}
