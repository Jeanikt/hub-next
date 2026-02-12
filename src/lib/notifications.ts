/**
 * Cria uma notificação para o usuário (persiste no banco e dispara em tempo real via Pusher).
 */
import { prisma } from "@/src/lib/prisma";
import { triggerUserNotification } from "@/src/lib/pusher";

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "mission_completed"
  | "match_found"
  | "generic";

export async function createNotification(
  userId: string,
  payload: { type: NotificationType; title: string; body?: string | null }
): Promise<void> {
  try {
    const notif = await prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
      },
    });
    await triggerUserNotification(userId, {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      body: notif.body ?? undefined,
      readAt: null,
      createdAt: notif.createdAt.toISOString(),
    });
  } catch (e) {
    console.error("createNotification", e);
  }
}
