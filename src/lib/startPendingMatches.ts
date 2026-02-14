/**
 * Inicia partidas com status "pending" que já têm 10 jogadores (5 red, 5 blue).
 * Atualiza direto no banco: status → in_progress, startedAt → now.
 * Leve: uma query + um update em lote; deve rodar a cada 15s.
 */
import { prisma } from "@/src/lib/prisma";
import { invalidateQueueStatusCache } from "@/src/lib/redis";

export type StartPendingResult = { started: number; matchIds: string[] };

const MAX_PENDING_TO_CHECK = 50;

export async function startPendingMatchesWithFullTeams(): Promise<StartPendingResult> {
  const pending = await prisma.gameMatch.findMany({
    where: { status: "pending" },
    include: {
      participants: { select: { team: true } },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_PENDING_TO_CHECK,
  });

  const toStart: number[] = [];
  for (const m of pending) {
    const red = m.participants.filter((p) => p.team === "red").length;
    const blue = m.participants.filter((p) => p.team === "blue").length;
    if (m.participants.length === 10 && red === 5 && blue === 5) {
      toStart.push(m.id);
    }
  }

  if (toStart.length === 0) {
    return { started: 0, matchIds: [] };
  }

  const now = new Date();
  await prisma.gameMatch.updateMany({
    where: { id: { in: toStart } },
    data: { status: "in_progress", startedAt: now },
  });

  const startedMatches = await prisma.gameMatch.findMany({
    where: { id: { in: toStart } },
    select: { matchId: true },
  });
  const matchIds = startedMatches.map((m) => m.matchId);

  await invalidateQueueStatusCache();

  return { started: toStart.length, matchIds };
}
