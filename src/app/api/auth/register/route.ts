import { NextResponse } from "next/server";

/**
 * Rota descontinuada. Novos usuários entram via NextAuth (Google).
 * Use a página /register ou /login e signIn("google").
 */
export async function POST() {
  return NextResponse.json(
    {
      message: "Registro por e-mail/senha descontinuado. Use NextAuth com Google na página /login.",
      use: "/login",
    },
    { status: 410 }
  );
}
