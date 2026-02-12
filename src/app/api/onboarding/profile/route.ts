import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { onboardingProfileSchema } from "@/src/lib/validators/schemas";
import { verifyAndCompleteMissions } from "@/src/lib/missions/verify";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = onboardingProfileSchema.safeParse(body);
  if (!parsed.success) {
    const flatten = parsed.error.flatten();
    return NextResponse.json(
      {
        message: flatten.formErrors[0] ?? "Dados inválidos.",
        errors: flatten.fieldErrors as { name?: string[]; username?: string[] },
      },
      { status: 422 }
    );
  }

  const existingUsername = await prisma.user.findFirst({
    where: {
      username: parsed.data.username,
      id: { not: session.user.id },
    },
  });
  if (existingUsername) {
    return NextResponse.json(
      { message: "Este username já está em uso." },
      { status: 409 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
    },
  });

  try {
    await verifyAndCompleteMissions(session.user.id);
  } catch {
    // não falha a resposta
  }

  return NextResponse.json({ username: parsed.data.username });
}
