import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { onboardingProfileSchema } from "@/src/lib/validators/schemas";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = onboardingProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.flatten().formErrors[0] ?? "Dados inválidos." },
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

  return NextResponse.json({ username: parsed.data.username });
}
