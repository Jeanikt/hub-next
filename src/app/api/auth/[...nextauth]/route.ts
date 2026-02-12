import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "@/src/lib/auth.config";
import { prisma } from "@/src/lib/prisma";

// Adapter criado aqui para que o prisma seja o mesmo módulo que trata o request (evita undefined no Turbopack).
const adapter = PrismaAdapter(prisma);
const config = {
  ...authConfig,
  adapter,
  secret: process.env.NEXTAUTH_SECRET,
};

const { handlers } = NextAuth(config);
export const { GET, POST } = handlers;
