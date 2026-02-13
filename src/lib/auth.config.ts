import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/src/lib/prisma";
import { isAllowedAdminEmail } from "@/src/lib/admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string | null;
      isAdmin?: boolean;
      /** true quando o e-mail está em ALLOWED_ADMIN_EMAIL (acesso ao painel /admin e botão na sidebar) */
      isSuperAdmin?: boolean;
      onboardingCompleted?: boolean;
    };
  }
}

/** Config compartilhada (adapter é injetado na rota para evitar undefined no bundle). */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? user.id;
        token.email = user.email ?? (token as { email?: string }).email;
        token.username = (user as { username?: string }).username;
        const email = (user.email ?? (token as { email?: string }).email) ?? null;
        const fromDb = (user as { isAdmin?: boolean }).isAdmin;
        token.isAdmin = fromDb === true || isAllowedAdminEmail(email);
        token.isSuperAdmin = isAllowedAdminEmail(email);
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted ?? false;
      }
      if (trigger === "update" && session) {
        if (session.username != null) token.username = session.username;
        if (session.onboardingCompleted != null) token.onboardingCompleted = session.onboardingCompleted;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? token.id as string;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.username = token.username as string | undefined;
        session.user.isAdmin = token.isAdmin as boolean | undefined;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean | undefined;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean | undefined;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;
      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, username: true, isAdmin: true, onboardingCompleted: true },
        });
        if (dbUser) {
          (user as { id?: string }).id = String(dbUser.id);
          (user as { username?: string }).username = dbUser.username ?? undefined;
          (user as { isAdmin?: boolean }).isAdmin = dbUser.isAdmin === true || isAllowedAdminEmail(user.email);
          (user as { onboardingCompleted?: boolean }).onboardingCompleted = dbUser.onboardingCompleted;
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { isOnline: true, lastLoginAt: new Date() },
          });
        }
      } catch {
        // Tabela users com estrutura diferente (ex.: Laravel snake_case) – permite login sem enriquecer sessão
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  trustHost: true,
};
