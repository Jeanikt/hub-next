import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { isAllowedAdmin } from "@/src/lib/admin";
import { z } from "zod";

const ROADMAP_STATUSES = ["suggestion", "priority", "development", "done"] as const;
const STATUS_ORDER: Record<string, number> = {
  suggestion: 0,
  priority: 1,
  development: 2,
  done: 3,
};

/** GET /api/roadmap – lista itens do roadmap (público). Retorna com contagem de curtidas e se o usuário logado curtiu. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const admin = session?.user?.id ? isAllowedAdmin(session) : false;
    const url = request.nextUrl;
    const withAuthor = url.searchParams.get("admin") === "1" && admin;

    const items = await prisma.roadmapItem.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { likes: true } },
        ...(withAuthor
          ? { author: { select: { id: true, username: true, name: true } } }
          : {}),
      },
    });

    let myLikedIds: string[] = [];
    if (session?.user?.id) {
      const liked = await prisma.roadmapLike.findMany({
        where: { userId: session.user.id },
        select: { roadmapItemId: true },
      });
      myLikedIds = liked.map((l) => l.roadmapItemId);
    }

    const list = items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      likesCount: item._count.likes,
      myLike: myLikedIds.includes(item.id),
      ...(withAuthor && item.author
        ? { authorId: item.author.id, authorUsername: item.author.username, authorName: item.author.name }
        : {}),
    }));

    return NextResponse.json({ items: list });
  } catch {
    return NextResponse.json({ error: "Erro ao listar roadmap." }, { status: 500 });
  }
}

const createSchema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres").max(200, "Máximo 200 caracteres").trim(),
  description: z.string().max(2000).trim().optional(),
});

/** POST /api/roadmap – criar sugestão (autenticado). Novo item entra em "suggestion". */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Faça login para enviar uma sugestão." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors?.title?.[0] ?? "Dados inválidos.";
      return NextResponse.json({ message: msg }, { status: 422 });
    }

    const item = await prisma.roadmapItem.create({
      data: {
        authorId: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: "suggestion",
      },
      include: { _count: { select: { likes: true } } },
    });

    return NextResponse.json({
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      likesCount: 0,
      myLike: false,
    });
  } catch {
    return NextResponse.json({ message: "Erro ao criar sugestão." }, { status: 500 });
  }
}
