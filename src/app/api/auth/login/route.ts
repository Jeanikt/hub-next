import { NextResponse } from "next/server";

/**
 * Rota descontinuada. Auth é feita via NextAuth (Google).
 * Use a página /login e signIn("google").
 */
export async function POST() {
  return NextResponse.json(
    {
      message: "Login por e-mail/senha descontinuado. Use NextAuth com Google na página /login.",
      use: "/login",
    },
    { status: 410 }
  );
}
