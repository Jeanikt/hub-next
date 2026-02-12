/**
 * Status online: considera usuário online se lastLoginAt estiver dentro da janela.
 * Atualizado no login e no heartbeat (GET /api/me).
 */

export const ONLINE_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export function isUserOnline(lastLoginAt: Date | string | null | undefined): boolean {
  if (!lastLoginAt) return false;
  const t = typeof lastLoginAt === "string" ? new Date(lastLoginAt).getTime() : lastLoginAt.getTime();
  return Date.now() - t < ONLINE_WINDOW_MS;
}
