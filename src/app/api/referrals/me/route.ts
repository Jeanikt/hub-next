import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { codeFromUsername, generateInviteCode } from "@/src/lib/inviteCode";

/** Origem da requisição (host da página: localhost, dev.hubexpresso.com, etc.) */
function getRequestOrigin(request: NextRequest): string {
  try {
    const url = new URL(request.url);
    return url.origin;
  } catch {
    return process.env.NEXT_PUBLIC_APP_URL ?? "https://dev.hubexpresso.com";
  }
}

/** GET /api/referrals/me – retorna código de convite do usuário, link e quantidade de convidados. Cria inviteCode se não existir. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { inviteCode: true, username: true },
  });
  if (!user) {
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  if (!user.inviteCode) {
    let finalCode = codeFromUsername(user.username) || generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const existing = await prisma.user.findFirst({ where: { inviteCode: finalCode }, select: { id: true } });
      if (!existing) break;
      finalCode = generateInviteCode();
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { inviteCode: finalCode },
    });
    user = { ...user, inviteCode: finalCode };
  }

  const referralCount = await prisma.referral.count({
    where: { inviterId: session.user.id },
  });

  const origin = getRequestOrigin(request);
  const inviteLink = `${origin}/login?ref=${encodeURIComponent(user.inviteCode!)}`;

  return NextResponse.json({
    inviteCode: user.inviteCode,
    inviteLink,
    referralCount,
  });
}
