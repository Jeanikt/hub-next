/**
 * Cria uma notificação para o usuário (persiste no banco).
 * O cliente atualiza via polling (sem Pusher).
 */
import { prisma } from "@/src/lib/prisma";

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "mission_completed"
  | "match_found"
  | "profile_like"
  | "generic";

export async function createNotification(
  userId: string,
  payload: { type: NotificationType; title: string; body?: string | null }
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
      },
    });
  } catch (e) {
    console.error("createNotification", e);
  }
}
