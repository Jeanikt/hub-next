import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { verifyAndCompleteMissions } from "@/src/lib/missions/verify";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
  });

  // Verifica missão "Perfil completo" etc. automaticamente
  try {
    await verifyAndCompleteMissions(session.user.id);
  } catch {
    // não falha a resposta
  }

  return NextResponse.json({ ok: true });
}
