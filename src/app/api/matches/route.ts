import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { randomUUID } from "crypto";
import { serverError, serverLog } from "@/src/lib/serverLog";

/** GET /api/matches – lista partidas (público, paginado). ?status=pending|in_progress|completed filtra. */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const perPage = Math.min(20, Math.max(1, parseInt(searchParams.get("per_page") ?? "10", 10)));
    const statusFilter = searchParams.get("status")?.trim();
    // "completed" alias para "finished"; nunca listar canceladas por padrão
    const statusValue = statusFilter === "completed" ? "finished" : statusFilter;
    const where = statusValue
      ? { status: statusValue }
      : { status: { not: "cancelled" } };

    const [matches, total] = await Promise.all([
      prisma.gameMatch.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          _count: { select: { participants: true } },
          creator: { select: { id: true, username: true } },
        },
      }),
      prisma.gameMatch.count({ where }),
    ]);

    const items = matches.map((m) => ({
      id: m.id,
      matchId: m.matchId,
      type: m.type,
      status: m.status,
      map: m.map ?? null,
      maxPlayers: m.maxPlayers,
      playerCount: m._count.participants,
      creator: m.creator,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({
      data: items,
      total,
      page,
      perPage,
    });
  } catch (e) {
    serverError("GET /api/matches", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao listar partidas." }, { status: 500 });
  }
}

/** POST /api/matches – criar partida (custom, competitive, practice) – auth. Desativado por padrão; admin pode ativar. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const { getAppSetting } = await import("@/src/lib/redis");
    const allowCreation = (await getAppSetting("allow_custom_matches")) ?? "1";
    if (allowCreation !== "1") {
      return NextResponse.json(
        { message: "Criação de partidas está desativada no momento. Apenas um administrador pode reativar." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const type = (body.type as string) ?? "custom";
    const validTypes = ["custom", "competitive", "practice"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { message: "type deve ser: custom, competitive ou practice." },
        { status: 422 }
      );
    }

      // bloqueia se já está em uma partida pendente ou em andamento (exceto canceled)
      const activeMatch = await prisma.gameMatchUser.findFirst({
        where: { userId: session.user.id, gameMatch: { status: { in: ["pending", "in_progress"] } } },
      });
      if (activeMatch) {
        return NextResponse.json(
          { message: "Você já está em uma partida pendente ou em andamento; não é possível criar outra partida." },
          { status: 409 }
        );
      }

    const match = await prisma.gameMatch.create({
      data: {
        matchId: randomUUID(),
        type,
        status: "pending",
        maxPlayers: 10,
        creatorId: session.user.id,
        settings: JSON.stringify({
          mode: type,
          map_pool: ["Abyss", "Bind", "Breeze", "Corrode", "Haven", "Pearl", "Split"],
          max_rounds: 13,
          overtime: true,
        }),
      },
    });
    serverLog("POST /api/matches", "Partida criada", { matchId: match.matchId })

    await prisma.gameMatchUser.create({
      data: {
        gameMatchId: match.id,
        userId: session.user.id,
        team: "red",
        role: "creator",
      },
    });

    return NextResponse.json({
      matchId: match.matchId,
      id: match.id,
      type: match.type,
      status: match.status,
    });
  } catch {
    return NextResponse.json(
      { message: "Erro ao criar partida." },
      { status: 500 }
    );
  }
}
