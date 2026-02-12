import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthTokenFromRequest, verifyAuthToken } from "@/src/lib/auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ message: "Token inválido." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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
        isBanned: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Erro em /api/auth/me", error);
    return NextResponse.json({ message: "Erro ao buscar usuário autenticado." }, { status: 500 });
  }
}

