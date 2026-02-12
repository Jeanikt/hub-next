import { NextResponse } from "next/server";

/** POST /api/auth/reset-password – redefine senha com token (stub: app usa só Google) */
export async function POST(request: Request) {
  await request.json().catch(() => ({}));
  return NextResponse.json(
    { message: "Senha alterada com sucesso." },
    { status: 200 }
  );
}
