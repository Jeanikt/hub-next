/**
 * Logs apenas no servidor (nunca no console do navegador).
 * Usa process.stdout para não ser removido pelo removeConsole em produção.
 * Uso: serverLog('GET /api/queue/status', 'request') ou serverLog(route, 'error', { err: message }).
 */
function isServer(): boolean {
  return typeof window === "undefined";
}

function write(level: string, route: string, message: string, meta?: Record<string, unknown>): void {
  if (!isServer()) return;
  const payload = { t: new Date().toISOString(), level, route, msg: message, ...meta };
  try {
    if (typeof process !== "undefined" && process.stdout?.write) {
      process.stdout.write(JSON.stringify(payload) + "\n");
    } else {
      (console as unknown as Record<string, (...args: unknown[]) => void>)[level === "error" ? "error" : "info"]?.("[server]", route, message, meta ?? "");
    }
  } catch {
    // ignore
  }
}

/** Log de requisição/evento (só servidor). */
export function serverLog(route: string, message: string, meta?: Record<string, unknown>): void {
  write("info", route, message, meta);
}

/** Log de aviso (só servidor). */
export function serverWarn(route: string, message: string, meta?: Record<string, unknown>): void {
  write("warn", route, message, meta);
}

/** Log de erro (só servidor). */
export function serverError(route: string, message: string, meta?: Record<string, unknown>): void {
  write("error", route, message, meta);
}
