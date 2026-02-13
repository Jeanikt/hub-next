/**
 * Rate limiter para a API Valorant (Henrik): 30 req/min no plano básico.
 * Limita a 28 req/min para margem; todas as chamadas à API passam por aqui.
 */

const MAX_REQUESTS_PER_MINUTE = 28;
const WINDOW_MS = 60_000;

const timestamps: number[] = [];

function prune(): void {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  while (timestamps.length > 0 && timestamps[0]! < cutoff) {
    timestamps.shift();
  }
}

/**
 * Espera até haver "slot" disponível (máx 28 req/min), então resolve.
 * Deve ser chamado antes de cada fetch à API Henrik.
 */
export function waitForValorantRateLimit(): Promise<void> {
  return new Promise((resolve) => {
    function tryAcquire() {
      prune();
      if (timestamps.length < MAX_REQUESTS_PER_MINUTE) {
        timestamps.push(Date.now());
        resolve();
        return;
      }
      const waitMs = timestamps[0]! + WINDOW_MS - Date.now() + 100;
      setTimeout(tryAcquire, Math.max(100, waitMs));
    }
    tryAcquire();
  });
}

/** Erro quando a própria API retorna 429 (rate limit). */
export const VALORANT_RATE_LIMIT_ERROR = "VALORANT_RATE_LIMIT";
