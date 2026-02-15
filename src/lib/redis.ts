/**
 * Redis para cache e configurações.
 * IMPORTANTE: toggles de admin precisam de persistência. Se Redis não estiver configurado,
 * retornamos erro no endpoint (não usamos default silencioso).
 */

import Redis from "ioredis";
import { randomUUID } from "crypto";

const SETTINGS_PREFIX = "hub:setting:";

type RedisClient = Redis;
let redisClient: RedisClient | null = null;

function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL);
}

function getClient(): RedisClient | null {
  if (!isRedisConfigured()) return null;
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    return redisClient;
  } catch {
    return null;
  }
}


function toString01(v: unknown): "0" | "1" | null {
  if (v === "0" || v === 0) return "0";
  if (v === "1" || v === 1) return "1";
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "0" || t === "1") return t as "0" | "1";
  }
  return null;
}

/** Exponha isso pro endpoint retornar debug */
export async function getRedisHealth(): Promise<{ configured: boolean; ok: boolean }> {
  const configured = isRedisConfigured();
  if (!configured) return { configured: false, ok: false };

  const client = getClient();
  if (!client) return { configured: true, ok: false };

  try {
    await client.ping();
    return { configured: true, ok: true };
  } catch {
    return { configured: true, ok: false };
  }
}

/** Lê configuração do app (Redis-only). Retorna null se não existir ou se Redis indisponível. */
export async function getAppSetting(key: string): Promise<"0" | "1" | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const v = await client.get(SETTINGS_PREFIX + key);
    return toString01(v);
  } catch {
    return null;
  }
}

/** Define configuração do app (Redis-only). */
export async function setAppSetting(key: string, value: "0" | "1"): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("redis_unavailable");
  await client.set(SETTINGS_PREFIX + key, value);
}

/* =======================
   cache de fila
   ======================= */

const QUEUE_STATUS_KEY = "hub:queue:status";
const QUEUE_STATUS_TTL = 3;

export async function getQueueStatusCache(): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const v = await client.get(QUEUE_STATUS_KEY);
    return typeof v === "string" ? v : v == null ? null : String(v);
  } catch {
    return null;
  }
}

export async function setQueueStatusCache(json: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.setex(QUEUE_STATUS_KEY, QUEUE_STATUS_TTL, json);
  } catch {}
}

export async function invalidateQueueStatusCache(): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.del(QUEUE_STATUS_KEY);
  } catch {}
}

export async function resetQueueCache(): Promise<void> {
  await invalidateQueueStatusCache();
}

/** Remove todo o cache e locks do hub (hub:*). Use em reset completo (ex.: admin). */
export async function clearAllHubCache(): Promise<number> {
  const client = getClient();
  if (!client) return 0;
  const keys: string[] = [];
  return new Promise((resolve, reject) => {
    const stream = client.scanStream({ match: "hub:*", count: 100 });
    stream.on("data", (chunk: string[]) => keys.push(...chunk));
    stream.on("end", async () => {
      if (keys.length === 0) {
        resolve(0);
        return;
      }
      try {
        let deleted = 0;
        for (let i = 0; i < keys.length; i += 100) {
          const batch = keys.slice(i, i + 100);
          deleted += await client.del(...batch);
        }
        resolve(deleted);
      } catch {
        resolve(0);
      }
    });
    stream.on("error", () => resolve(0));
  });
}

const USERS_COUNT_KEY = "hub:users:count";
const USERS_COUNT_TTL = 60;

export async function getUsersCountCache(): Promise<number | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const v = await client.get(USERS_COUNT_KEY);
    if (v == null) return null;
    const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

export async function setUsersCountCache(total: number): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.setex(USERS_COUNT_KEY, USERS_COUNT_TTL, String(total));
  } catch {}
}

/* =======================
   LOCKS (para evitar race na criação de partida)
   ======================= */

export type QueueMatchLock = { key: string; token: string };

export async function acquireQueueMatchLock(queueType: string, ttlSeconds = 12): Promise<QueueMatchLock | null> {
  const client = getClient();
  if (!client) return null;

  const key = `hub:queue:matchlock:${queueType}`;
  const token = randomUUID();

  try {
    // ioredis: set with NX and EX options
    const ok = await client.set(key, token, "EX", ttlSeconds, "NX");
    return ok ? { key, token } : null;
  } catch {
    return null;
  }
}

export async function releaseQueueMatchLock(lock: QueueMatchLock): Promise<void> {
  const client = getClient();
  if (!client) return;

  // release seguro: só apaga se o token for o mesmo
  const lua = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

  try {
    await client.eval(lua, 1, lock.key, lock.token);
  } catch {
    // fallback simples
    try {
      await client.del(lock.key);
    } catch {}
  }
}

/* =======================
   Pending accept (10s) – fila com 10 jogadores aguardando aceite
   ======================= */

const PENDING_ACCEPT_PREFIX = "hub:queue:pending:";
const PENDING_ACCEPT_TTL = 15;

export type PendingAcceptData = {
  userIds: string[];
  accepted: Record<string, boolean>;
  createdAt: number;
};

export async function getPendingAccept(queueType: string): Promise<PendingAcceptData | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const raw = await client.get(PENDING_ACCEPT_PREFIX + queueType);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingAcceptData;
    return data?.userIds?.length ? data : null;
  } catch {
    return null;
  }
}

export async function setPendingAccept(queueType: string, userIds: string[]): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    const payload: PendingAcceptData = {
      userIds,
      accepted: {},
      createdAt: Date.now(),
    };
    await client.setex(PENDING_ACCEPT_PREFIX + queueType, PENDING_ACCEPT_TTL, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/** Atualização atômica (WATCH + multi) para evitar race quando vários jogadores aceitam ao mesmo tempo. */
export async function setUserAcceptedInPending(queueType: string, userId: string, accept: boolean): Promise<{ allAccepted: boolean; accepted: Record<string, boolean> } | null> {
  const client = getClient();
  if (!client) return null;
  const key = PENDING_ACCEPT_PREFIX + queueType;
  const maxRetries = 10;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await client.watch(key);
      const raw = await client.get(key);
      if (!raw) {
        await client.unwatch();
        return null;
      }
      const data = JSON.parse(raw) as PendingAcceptData;
      if (!data.userIds.includes(userId)) {
        await client.unwatch();
        return null;
      }
      data.accepted[userId] = accept;
      const acceptedCount = Object.values(data.accepted).filter(Boolean).length;
      const allAccepted = data.userIds.length === acceptedCount && data.userIds.every((id) => data.accepted[id] === true);
      const result = await client.multi().setex(key, PENDING_ACCEPT_TTL, JSON.stringify(data)).exec();
      if (result === null) continue; // WATCH detectou mudança, retry
      return { allAccepted, accepted: data.accepted };
    } catch {
      await client.unwatch().catch(() => {});
      if (attempt === maxRetries - 1) return null;
    }
  }
  return null;
}

export async function deletePendingAccept(queueType: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.del(PENDING_ACCEPT_PREFIX + queueType);
  } catch {}
}

/** Retorna os userIds que ainda não aceitaram (para remover da fila ao expirar). */
export async function expirePendingAcceptIfNeeded(queueType: string): Promise<string[] | null> {
  const data = await getPendingAccept(queueType);
  if (!data) return null;
  const elapsed = Date.now() - data.createdAt;
  if (elapsed < 10_000) return null; // 10s não passou
  const notAccepted = data.userIds.filter((id) => data.accepted[id] !== true);
  await deletePendingAccept(queueType);
  return notAccepted;
}
