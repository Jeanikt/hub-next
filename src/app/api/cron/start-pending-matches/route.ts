import { NextRequest, NextResponse } from "next/server";
import { startPendingMatchesWithFullTeams } from "@/src/lib/startPendingMatches";
import { serverError } from "@/src/lib/serverLog";

const CRON_SECRET = process.env.CRON_SECRET ?? process.env.CRON_API_KEY;

/**
 * GET /api/cron/start-pending-matches – inicia partidas "pending" que já têm 10 jogadores (5v5).
 * Atualiza no banco: status → in_progress, startedAt → now.
 * Protegido por CRON_SECRET. Agendar a cada 15 segundos.
 */
export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "Cron não configurado (CRON_SECRET)." },
      { status: 501 }
    );
  }

  const urlSecret = request.nextUrl.searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const provided = urlSecret ?? bearer;

  if (provided !== CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await startPendingMatchesWithFullTeams();
    return NextResponse.json({
      ok: true,
      message: result.started > 0 ? `${result.started} partida(s) iniciada(s).` : "Nenhuma partida pendente com 10 jogadores.",
      ...result,
    });
  } catch (e) {
    serverError("GET /api/cron/start-pending-matches", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { error: "Erro ao iniciar partidas pendentes." },
      { status: 500 }
    );
  }
}
