import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

/** POST /api/roadmap/[id]/like – curtir ou descurtir (uma curtida por usuário por sugestão). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Faça login para curtir." }, { status: 401 });
    }

    const { id: roadmapItemId } = await params;

    const existing = await prisma.roadmapLike.findUnique({
      where: {
        userId_roadmapItemId: { userId: session.user.id, roadmapItemId },
      },
    });

    if (existing) {
      await prisma.roadmapLike.delete({
        where: { id: existing.id },
      });
      const count = await prisma.roadmapLike.count({ where: { roadmapItemId } });
      return NextResponse.json({ liked: false, likesCount: count });
    }

    await prisma.roadmapLike.create({
      data: { userId: session.user.id, roadmapItemId },
    });
    const count = await prisma.roadmapLike.count({ where: { roadmapItemId } });
    return NextResponse.json({ liked: true, likesCount: count });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2003") {
      return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ message: "Erro ao curtir." }, { status: 500 });
  }
}
