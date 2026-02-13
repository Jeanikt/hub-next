import NextAuth from "next-auth";
import { authConfig } from "@/src/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
});

/** Tipo do usuário autenticado na sessão (sem dados sensíveis) */
export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null;
  isAdmin?: boolean;
  onboardingCompleted?: boolean;
};
