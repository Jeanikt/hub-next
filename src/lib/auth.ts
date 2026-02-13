import NextAuth from "next-auth";
import { authConfig } from "@/src/lib/auth.config";

const isProd = process.env.NODE_ENV === "production";
const cookieDomain = isProd ? ".hubexpresso.com" : undefined; 

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,

  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        domain: cookieDomain,
      },
    },
    csrfToken: {
      name: isProd ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        domain: cookieDomain,
      },
    },
    callbackUrl: {
      name: isProd ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: isProd,
        domain: cookieDomain,
      },
    },
  },
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
