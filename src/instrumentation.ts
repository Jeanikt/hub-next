/**
 * Instrumentation: roda quando o servidor Node.js inicia.
 * Inicia os jobs de partida dentro do projeto (sem depender de cron externo):
 * - A cada 15s: partidas pending com 10 jogadores → in_progress
 * - A cada 1 min: sincroniza com Valorant e marca partidas finalizadas (status, K/D/A, ELO, XP)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startMatchCronJobs } = await import("./lib/matchCronJobs");
  startMatchCronJobs();
}
