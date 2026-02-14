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
    if (result.started > 0 && process.env.NODE_ENV !== "test") {
      console.info(
        `[match-cron] ${result.started} partida(s) pendente(s) iniciada(s).`
      );
    }
  } catch (e) {
    console.error("[match-cron] start-pending-matches:", e);
  }
}

async function runSyncMatchesFromRiot(): Promise<void> {
  try {
    const { syncPendingMatchesFromRiot } = await import("./matchSync");
    const result = await syncPendingMatchesFromRiot();
    if (
      (result.updated > 0 || result.errors.length > 0) &&
      process.env.NODE_ENV !== "test"
    ) {
      console.info(
        `[match-cron] check-matches: ${result.updated} atualizada(s), ${result.errors.length} erro(s).`
      );
    }
  } catch (e) {
    console.error("[match-cron] check-matches:", e);
  }
}
