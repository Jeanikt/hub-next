import { NextRequest, NextResponse } from "next/server";

/** POST /api/auth/verify-email?id=&hash= – verifica e-mail (stub: OAuth já verifica) */
export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const hash = request.nextUrl.searchParams.get("hash");
  if (!id || !hash) {
    return NextResponse.json({ message: "Link inválido." }, { status: 400 });
  }
  return NextResponse.json({ message: "E-mail verificado." }, { status: 200 });
}
