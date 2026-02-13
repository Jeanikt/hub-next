import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { prisma } from "@/src/lib/prisma";

/** GET /api/admin/missions – lista todas as missões (ativas e inativas). Apenas admin. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    const missions = await prisma.mission.findMany({
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        xpReward: true,
        isActive: true,
        createdAt: true,
        _count: { select: { completions: true } },
      },
    });
    return NextResponse.json({
      data: missions.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        type: m.type,
        xpReward: m.xpReward,
        isActive: m.isActive,
        createdAt: m.createdAt,
        completionsCount: m._count.completions,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao listar missões." }, { status: 500 });
  }
}

/** POST /api/admin/missions – cadastra nova missão. Body: { title, description?, type, xpReward, isActive? }. Apenas admin. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "";
    const xpReward = typeof body.xpReward === "number" ? body.xpReward : parseInt(String(body.xpReward ?? 0), 10);
    const description = typeof body.description === "string" ? body.description.trim() || null : null;
    const isActive = body.isActive !== false;

    if (!title || title.length < 2) {
      return NextResponse.json({ message: "Título é obrigatório (mín. 2 caracteres)." }, { status: 422 });
    }
    if (!type || type.length < 1) {
      return NextResponse.json({ message: "Tipo é obrigatório (ex.: daily, weekly, one_time)." }, { status: 422 });
    }
    if (!Number.isFinite(xpReward) || xpReward < 0) {
      return NextResponse.json({ message: "XP deve ser um número >= 0." }, { status: 422 });
    }

    const mission = await prisma.mission.create({
      data: {
        title,
        description: description || undefined,
        type,
        xpReward,
        isActive,
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        xpReward: true,
        isActive: true,
        createdAt: true,
        _count: { select: { completions: true } },
      },
    });
    return NextResponse.json({
      data: {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        type: mission.type,
        xpReward: mission.xpReward,
        isActive: mission.isActive,
        createdAt: mission.createdAt,
        completionsCount: mission._count.completions,
      },
    });
  } catch (e) {
    console.error("POST /api/admin/missions", e);
    return NextResponse.json({ error: "Erro ao cadastrar missão." }, { status: 500 });
  }
}
