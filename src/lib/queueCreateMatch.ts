/**
 * Cria partida a partir dos jogadores na fila (usado após todos aceitarem no timer de 10s).
 */
import { prisma } from "@/src/lib/prisma";
import { randomUUID } from "crypto";
import { ROLE_IDS } from "@/src/lib/roles";
import { generateMatchCode } from "@/src/lib/inviteCode";
import {
  acquireQueueMatchLock,
  releaseQueueMatchLock,
  invalidateQueueStatusCache,
  deletePendingAccept,
} from "@/src/lib/redis";
import { FOURTH_QUEUE_TYPE, getPlayersRequired } from "@/src/lib/queues";
import type { QueueType } from "@/src/lib/queues";

function getQueueSizes(qt: QueueType): { playersNeeded: number; redSize: number; blueSize: number } {
  const needed = getPlayersRequired(qt);
  if (needed === 2) return { playersNeeded: 2, redSize: 1, blueSize: 1 };
  return { playersNeeded: 10, redSize: 5, blueSize: 5 };
}

function assignTeamsByRole<
  T extends { userId: string; user: { primaryRole: string | null } }
>(entries: T[], redSize: number, blueSize: number): T[][] {
  const red: T[] = [];
  const blue: T[] = [];
  const assigned = new Set<string>();
  for (const role of ROLE_IDS) {
    const withRole = entries.filter((e) => (e.user.primaryRole ?? "") === role);
    withRole.forEach((e, i) => {
      if (assigned.has(e.userId)) return;
      assigned.add(e.userId);
      if (i % 2 === 0 && red.length < redSize) red.push(e);
      else if (blue.length < blueSize) blue.push(e);
      else red.push(e);
    });
  }
  const remaining = entries.filter((e) => !assigned.has(e.userId));
  for (const e of remaining) {
    if (red.length < redSize) red.push(e);
    else blue.push(e);
  }
  return [red, blue];
}

export async function createMatchFromQueue(queueType: QueueType): Promise<{ matchId: string } | null> {
  const { playersNeeded, redSize, blueSize } = getQueueSizes(queueType);
  const lock = await acquireQueueMatchLock(queueType, 12);
  if (!lock) return null;
  try {
    const entries = await prisma.queueEntry.findMany({
      where: { queueType },
      orderBy: { joinedAt: "asc" },
      take: playersNeeded,
      include: { user: { select: { primaryRole: true, hex: true } } },
    });
    if (entries.length < playersNeeded) return null;

    // Ordenar por role e depois por HEX desc para balancear times (elos próximos)
    const sorted = [...entries].sort((a, b) => {
      const rA = ROLE_IDS.indexOf(a.user.primaryRole ?? "");
      const rB = ROLE_IDS.indexOf(b.user.primaryRole ?? "");
      if (rA !== rB) return rA - rB;
      return (b.user.hex ?? 0) - (a.user.hex ?? 0);
    });

    const [redTeam, blueTeam] = assignTeamsByRole(sorted, redSize, blueSize);
    const orderedEntries = [...redTeam, ...blueTeam].slice(0, playersNeeded);

    const mapPool = ["Abyss", "Bind", "Breeze", "Corrode", "Haven", "Pearl", "Split"];
    const chosenMap = mapPool[Math.floor(Math.random() * mapPool.length)];
    const matchCode = generateMatchCode();
    const matchUuid = randomUUID();

    const match = await prisma.$transaction(async (tx) => {
      const created = await tx.gameMatch.create({
        data: {
          matchId: matchUuid,
          type: queueType,
          status: "in_progress",
          map: chosenMap,
          maxPlayers: playersNeeded,
          startedAt: new Date(),
          settings: JSON.stringify({
            visibility: queueType === FOURTH_QUEUE_TYPE ? "test" : "public",
            queue_type: queueType,
            map_pool: mapPool,
            match_code: matchCode,
          }),
          creatorId: orderedEntries[0].userId,
        },
      });

      await tx.gameMatchUser.createMany({
        data: orderedEntries.map((e, i) => {
          const team = i < redSize ? "red" : "blue";
          const role = i === 0 ? "creator" : e.user.primaryRole ?? "player";
          return {
            gameMatchId: created.id,
            userId: e.userId,
            team,
            role,
          };
        }),
      });

      await tx.queueEntry.deleteMany({
        where: { userId: { in: orderedEntries.map((e) => e.userId) } },
      });

      await tx.queueWaitingMessage.deleteMany({
        where: { queueType },
      });

      return created;
    });

    await deletePendingAccept(queueType);
    await invalidateQueueStatusCache();
    return { matchId: match.matchId };
  } finally {
    await releaseQueueMatchLock(lock);
  }
}
