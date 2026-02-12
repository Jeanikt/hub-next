import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

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

  return NextResponse.json({ ok: true });
}
