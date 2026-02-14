/**
 * One-off: cancela todas as partidas pendentes/in_progress e esvazia todas as filas.
 * Uso: npx tsx prisma/scripts/reset-queues-and-cancel-matches.ts
 * Requer DATABASE_URL no ambiente (ex.: .env na raiz do projeto).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cancelled = await prisma.gameMatch.updateMany({
    where: { status: { in: ["pending", "in_progress"] } },
    data: { status: "cancelled", finishedAt: new Date() },
  });
  const deleted = await prisma.queueEntry.deleteMany({});
  console.log(`Partidas canceladas: ${cancelled.count}`);
  console.log(`Entradas de fila removidas: ${deleted.count}`);
  console.log("Feito. Se usar Redis para cache de fila, reinicie o app ou aguarde o cache expirar.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
