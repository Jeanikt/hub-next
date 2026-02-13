import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { isAllowedAdmin } from "@/src/lib/admin";

const VALID_STATUSES = ["suggestion", "priority", "development", "done"] as const;

/** PATCH /api/roadmap/[id] – admin: alterar status (mover coluna) ou deletar. */
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

    if (body.delete === true) {
      await prisma.roadmapItem.delete({ where: { id } });
      return NextResponse.json({ deleted: true });
    }

    const status = body.status;
    if (typeof status !== "string" || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json({ message: "Status inválido." }, { status: 422 });
    }

    const item = await prisma.roadmapItem.update({
      where: { id },
      data: { status },
      include: { _count: { select: { likes: true } } },
    });

    return NextResponse.json({
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      likesCount: item._count.likes,
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ message: "Erro ao atualizar." }, { status: 500 });
  }
}

/** DELETE /api/roadmap/[id] – admin: remover item. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.roadmapItem.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ message: "Erro ao remover." }, { status: 500 });
  }
}
