/**
 * Pusher para real-time no Vercel (filas, notificações, chat).
 * Funciona em serverless; não mantém WebSocket no servidor.
 * Configure PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER no .env.
 */

let pusherServer: {
  trigger: (channel: string, event: string, data: unknown) => Promise<void>;
} | null = null;

async function getPusher() {
  if (pusherServer) return pusherServer;
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER ?? "us2";
  if (!appId || !key || !secret) return null;
  try {
    const { default: Pusher } = await import("pusher");
    pusherServer = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
    return pusherServer;
  } catch {
    return null;
  }
}

const CHANNEL_QUEUE = "queue";
const EVENT_QUEUE_UPDATE = "status-update";
const EVENT_MATCH_FOUND = "match-found";

/** Dispara atualização em tempo real para todas as filas (clientes recarregam dados). */
export async function triggerQueueUpdate(): Promise<void> {
  const p = await getPusher();
  if (!p) return;
  try {
    await p.trigger(CHANNEL_QUEUE, EVENT_QUEUE_UPDATE, { ts: Date.now() });
  } catch (e) {
    console.error("Pusher trigger queue", e);
  }
}

/** Dispara "partida encontrada" para os jogadores da partida (canal público queue; cliente verifica userId). */
export async function triggerMatchFound(matchId: string, userIds: string[]): Promise<void> {
  const p = await getPusher();
  if (!p) return;
  try {
    await p.trigger(CHANNEL_QUEUE, EVENT_MATCH_FOUND, { matchId, userIds });
  } catch (e) {
    console.error("Pusher trigger match-found", e);
  }
}

const CHANNEL_NOTIFICATIONS_PREFIX = "private-notifications-";
const EVENT_NOTIFICATION = "new-notification";

/** Dispara notificação em tempo real para um usuário (canal private-notifications-{userId}). */
export async function triggerUserNotification(userId: string, payload: { title?: string; body?: string; [key: string]: unknown }): Promise<void> {
  const p = await getPusher();
  if (!p) return;
  try {
    await p.trigger(`${CHANNEL_NOTIFICATIONS_PREFIX}${userId}`, EVENT_NOTIFICATION, payload);
  } catch (e) {
    console.error("Pusher trigger notification", e);
  }
}

export function getPusherClientConfig(): { key: string; cluster: string } | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY ?? process.env.PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? process.env.PUSHER_CLUSTER ?? "us2";
  if (!key) return null;
  return { key, cluster };
}
