import { NextResponse } from "next/server";

/** POST /api/auth/two-factor – challenge 2FA (stub: integrar quando 2FA estiver ativo) */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const callbackUrl = (body.callback_url as string) ?? "/dashboard";
  return NextResponse.json(
    { redirect_url: callbackUrl, message: "2FA não configurado; redirecionando." },
    { status: 200 }
  );
}
