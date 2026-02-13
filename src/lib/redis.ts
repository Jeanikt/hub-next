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

const SETTINGS_PREFIX = "hub:setting:";

/** Fallback em memória quando Redis não está configurado (toggles admin funcionam na sessão atual). */
const memorySettings = new Map<string, string>();

/** Lê configuração de app (ex.: allow_custom_matches, queues_disabled). Usa Redis ou fallback em memória. */
export async function getAppSetting(key: string): Promise<string | null> {
  const client = await getClient();
  if (client) {
    try {
      const v = await client.get(SETTINGS_PREFIX + key);
      if (typeof v === "string") return v;
    } catch {
      // fall through to memory
    }
  }
  return memorySettings.get(key) ?? null;
}

/** Define configuração de app (valor string, ex. "1" ou "0"). Persiste no Redis ou em memória. */
export async function setAppSetting(key: string, value: string): Promise<void> {
  const client = await getClient();
  if (client) {
    try {
      await client.set(SETTINGS_PREFIX + key, value);
      return;
    } catch {
      // fall through to memory
    }
  }
  memorySettings.set(key, value);
}
