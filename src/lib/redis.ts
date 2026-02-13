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
