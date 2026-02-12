import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";

/**
 * GET /api/auth/me
 *
 * Endpoint compativel com clients que esperam um "/auth/me" customizado.
 * Usa a sessao do NextAuth (JWT) em vez de tokens manuais.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        rank: true,
        xp: true,
        elo: true,
        level: true,
        isAdmin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Usuario nao encontrado." }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Erro em /api/auth/me", error);
    return NextResponse.json({ message: "Erro ao buscar usuario autenticado." }, { status: 500 });
  }
}
