"use client";

/**
 * Toca um beep curto (Web Audio API) e opcionalmente mostra notificação do browser.
 * Usado quando: partida encontrada na fila, código da partida informado pelo criador.
 */

function playBeep(frequency = 880, durationMs = 200): void {
  if (typeof window === "undefined" || !window.AudioContext && !(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // ignore
  }
}

/** Beep de "partida encontrada" (dois tons) */
export function playMatchFoundSound(): void {
  playBeep(523, 150);
  setTimeout(() => playBeep(784, 220), 180);
}

/** Beep de "aceite a partida" (10 na fila, 10s para aceitar) */
export function playAcceptPromptSound(): void {
  playBeep(660, 120);
  setTimeout(() => playBeep(660, 120), 150);
  setTimeout(() => playBeep(880, 180), 320);
}

/** Beep de "código da partida disponível" */
export function playCodeAvailableSound(): void {
  playBeep(659, 120);
  setTimeout(() => playBeep(659, 120), 140);
  setTimeout(() => playBeep(880, 200), 300);
}

const NOTIFICATION_TITLE = "HUBEXPRESSO";

export async function notifyMatchFound(matchId: string): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(NOTIFICATION_TITLE, {
        body: "Partida encontrada! Clique para abrir.",
        tag: `match-${matchId}`,
        requireInteraction: false,
      });
    } catch {
      // ignore
    }
  }
}

export async function notifyCodeAvailable(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(NOTIFICATION_TITLE, {
        body: "O criador informou o código da partida. Entre no Valorant!",
        tag: "match-code",
        requireInteraction: false,
      });
    } catch {
      // ignore
    }
  }
}

/** Pede permissão para notificações (chamar no clique do usuário). */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}
