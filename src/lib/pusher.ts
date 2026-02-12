/**
 * Real-time: removido Pusher (limite de conexões / custo).
 * Notificações e fila usam polling (sem custo, sem dependência externa).
 */

export async function getPusherServer(): Promise<null> {
  return null;
}

export function getPusherClientConfig(): null {
  return null;
}

export async function triggerQueueUpdate(): Promise<void> {}
export async function triggerMatchFound(_matchId: string, _userIds: string[]): Promise<void> {}
export async function triggerUserNotification(
  _userId: string,
  _payload: { title?: string; body?: string; [key: string]: unknown }
): Promise<void> {}
