import { PrismaClient } from "@prisma/client";

// Singleton: uma única instância por process (evita centenas de conexões em serverless/múltiplos workers).
// Em produção, use DATABASE_URL com ?connection_limit=10 (ou menor) para limitar conexões por instância.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

global.prisma = prisma;

