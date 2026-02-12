import { NextResponse } from "next/server";

/** POST /api/auth/forgot-password – envia link de redefinição (stub: app usa só Google) */
export async function POST(request: Request) {
  await request.json().catch(() => ({}));
  // Em app só OAuth não há senha; manter rota para paridade.
  return NextResponse.json(
    { message: "Se existir uma conta com este e-mail, você receberá um link." },
    { status: 200 }
  );
}
