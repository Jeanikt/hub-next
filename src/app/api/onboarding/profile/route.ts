import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { onboardingProfileSchema } from "@/src/lib/validators/schemas";
import { verifyAndCompleteMissions } from "@/src/lib/missions/verify";
import { parseCpf } from "@/src/lib/cpf";
import { encrypt, hashForLookup } from "@/src/lib/encryption";

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
        errors: flatten.fieldErrors as { name?: string[]; username?: string[]; cpf?: string[] },
      },
      { status: 422 }
    );
  }

  const cpfNormalized = parseCpf(parsed.data.cpf);
  if (!cpfNormalized) {
    return NextResponse.json(
      { message: "CPF inválido.", errors: { cpf: ["CPF inválido ou dígitos verificadores incorretos."] } },
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

  const cpfHash = hashForLookup(cpfNormalized);
  const existingCpf = await prisma.user.findFirst({
    where: { cpfHash },
    select: { id: true },
  });
  if (existingCpf && existingCpf.id !== session.user.id) {
    return NextResponse.json(
      { message: "Este CPF já está vinculado a outra conta. Só é permitida uma conta por pessoa." },
      { status: 409 }
    );
  }

  const cpfEncrypted = encrypt(cpfNormalized);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      cpfHash,
      cpfEncrypted,
    },
  });

  try {
    await verifyAndCompleteMissions(session.user.id);
  } catch {
    // não falha a resposta
  }

  return NextResponse.json({ username: parsed.data.username });
}
