/**
 * Redis (Upstash) para cache e desempenho no Vercel.
 * Se UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN não estiverem definidos, as funções são no-op.
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

type RedisClient = InstanceType<typeof import("@upstash/redis").Redis>;
let redisClient: RedisClient | null = null;

async function getClient(): Promise<RedisClient | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  if (redisClient) return redisClient;
  try {
    const { Redis } = await import("@upstash/redis");
    redisClient = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
    return redisClient;
  } catch {
    return null;
  }
}

const QUEUE_STATUS_KEY = "hub:queue:status";
const QUEUE_STATUS_TTL = 3; // segundos

/** Retorna o status da fila em cache ou null se não houver cache/Redis. */
export async function getQueueStatusCache(): Promise<string | null> {
  const client = await getClient();
  if (!client) return null;
  try {
    return await client.get(QUEUE_STATUS_KEY);
  } catch {
    return null;
  }
}

/** Armazena o status da fila em cache. */
export async function setQueueStatusCache(json: string): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.set(QUEUE_STATUS_KEY, json, { ex: QUEUE_STATUS_TTL });
  } catch {
    // ignore
  }
}

/** Invalida o cache da fila (chamar em join/leave). */
export async function invalidateQueueStatusCache(): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.del(QUEUE_STATUS_KEY);
  } catch {
    // ignore
  }
}

/** Limpa o cache da fila (útil para debug/reset). O Redis neste app só armazena hub:queue:status com TTL 3s. */
export async function resetQueueCache(): Promise<void> {
  await invalidateQueueStatusCache();
}

const USERS_COUNT_KEY = "hub:users:count";
const USERS_COUNT_TTL = 60;

/** Retorna total de jogadores em cache (Redis) ou null. */
export async function getUsersCountCache(): Promise<number | null> {
  const client = await getClient();
  if (!client) return null;
  try {
    const v = await client.get(USERS_COUNT_KEY);
    if (v === null || v === undefined) return null;
    const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

/** Armazena total de jogadores em cache (TTL 60s). */
export async function setUsersCountCache(total: number): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.set(USERS_COUNT_KEY, String(total), { ex: USERS_COUNT_TTL });
  } catch {
    // ignore
  }
}

const SETTINGS_PREFIX = "hub:setting:";

/** Valores padrão quando não configurado: filas desativadas, criação de partidas desativada. */
const DEFAULT_SETTINGS: Record<string, string> = {
  allow_custom_matches: "0",
  queues_disabled: "1",
};

/** Lê configuração de app (ex.: allow_custom_matches, queues_disabled). Ordem: Redis (cache) → banco (AppSetting) → padrão. */
export async function getAppSetting(key: string): Promise<string | null> {
  const client = await getClient();
  if (client) {
    try {
      const v = await client.get(SETTINGS_PREFIX + key);
      if (typeof v === "string") return v;
    } catch {
      // fall through to DB
    }
  }
  try {
    const { prisma } = await import("./prisma");
    const row = await prisma.appSetting.findUnique({ where: { key } });
    if (row?.value != null) {
      if (client) {
        try {
          await client.set(SETTINGS_PREFIX + key, row.value);
        } catch {
          // ignore
        }
      }
      return row.value;
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS[key] ?? null;
}

/** Define configuração de app (valor string, ex. "1" ou "0"). Persiste no banco e atualiza cache Redis. */
export async function setAppSetting(key: string, value: string): Promise<void> {
  try {
    const { prisma } = await import("./prisma");
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  } catch (e) {
    console.error("setAppSetting DB", key, e);
    throw e;
  }
  const client = await getClient();
  if (client) {
    try {
      await client.set(SETTINGS_PREFIX + key, value);
    } catch {
      // ignore
    }
  }
}
