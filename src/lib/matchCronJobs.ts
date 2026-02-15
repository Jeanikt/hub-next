/**
 * Jobs de verificação de partidas rodando dentro do projeto (não dependem de cron externo).
 * - A cada 15s: inicia partidas "pending" com 10 jogadores (5v5).
 * - A cada 1 min: sincroniza partidas in_progress com Valorant e marca como finished quando acabar.
 */
const START_PENDING_INTERVAL_MS = 15_000;
const SYNC_MATCHES_INTERVAL_MS = 60_000;
const INITIAL_DELAY_MS = 8_000;

export function startMatchCronJobs(): void {
  if (typeof setInterval === "undefined") return;

  setTimeout(() => {
    runStartPendingMatches();
    setInterval(runStartPendingMatches, START_PENDING_INTERVAL_MS);
  }, INITIAL_DELAY_MS);

  setTimeout(() => {
    runSyncMatchesFromRiot();
    setInterval(runSyncMatchesFromRiot, SYNC_MATCHES_INTERVAL_MS);
  }, INITIAL_DELAY_MS + 2_000);
}

async function runStartPendingMatches(): Promise<void> {
  try {
    const { startPendingMatchesWithFullTeams } = await import(
      "./startPendingMatches"
    );
    const result = await startPendingMatchesWithFullTeams();
  } catch {
    // ignore
  }
}

async function runSyncMatchesFromRiot(): Promise<void> {
  try {
    const { syncPendingMatchesFromRiot } = await import("./matchSync");
    const result = await syncPendingMatchesFromRiot();
  } catch {
    // ignore
  }
}
