/**
 * Redis (Upstash) para cache e configurações.
 * IMPORTANTE: toggles de admin precisam de persistência. Se Redis não estiver configurado,
 * retornamos erro no endpoint (não usamos default silencioso).
 */

const SETTINGS_PREFIX = "hub:setting:";

type RedisClient = InstanceType<typeof import("@upstash/redis").Redis>;
let redisClient: RedisClient | null = null;

function isRedisConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function getClient(): Promise<RedisClient | null> {
  if (!isRedisConfigured()) return null;
  if (redisClient) return redisClient;

  try {
    const { Redis } = await import("@upstash/redis");
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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

  const client = await getClient();
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
  const client = await getClient();
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
  const client = await getClient();
  if (!client) throw new Error("redis_unavailable");
  await client.set(SETTINGS_PREFIX + key, value);
}

/* =======================
   (seu cache de fila pode ficar como estava)
   ======================= */

const QUEUE_STATUS_KEY = "hub:queue:status";
const QUEUE_STATUS_TTL = 3;

export async function getQueueStatusCache(): Promise<string | null> {
  const client = await getClient();
  if (!client) return null;
  try {
    const v = await client.get(QUEUE_STATUS_KEY);
    return typeof v === "string" ? v : v == null ? null : String(v);
  } catch {
    return null;
  }
}

export async function setQueueStatusCache(json: string): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.set(QUEUE_STATUS_KEY, json, { ex: QUEUE_STATUS_TTL });
  } catch {}
}

export async function invalidateQueueStatusCache(): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.del(QUEUE_STATUS_KEY);
  } catch {}
}

export async function resetQueueCache(): Promise<void> {
  await invalidateQueueStatusCache();
}

const USERS_COUNT_KEY = "hub:users:count";
const USERS_COUNT_TTL = 60;

export async function getUsersCountCache(): Promise<number | null> {
  const client = await getClient();
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
  const client = await getClient();
  if (!client) return;
  try {
    await client.set(USERS_COUNT_KEY, String(total), { ex: USERS_COUNT_TTL });
  } catch {}
}
