import { NextRequest, NextResponse } from "next/server";
import { syncPendingMatchesFromRiot } from "@/src/lib/matchSync";
import { VALORANT_RATE_LIMIT_ERROR } from "@/src/lib/valorant";
import { serverError } from "@/src/lib/serverLog";

const CRON_SECRET = process.env.CRON_SECRET ?? process.env.CRON_API_KEY;

/**
 * GET /api/cron/check-matches – verifica partidas in_progress e sincroniza com partidas
 * encerradas no Valorant (API Henrik). Ao detectar fim da partida: status → finished,
 * K/D/A, ELO, XP e nível no banco; missões verificadas. Protegido por CRON_SECRET.
 * Agende a cada 1 minuto para resultado e histórico rápidos sem sobrecarregar a API Riot.
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
    const result = await syncPendingMatchesFromRiot();
    return NextResponse.json({
      ok: true,
      message: "Verificação de partidas concluída.",
      ...result,
    });
  } catch (e) {
    serverError("GET /api/cron/check-matches", "error", { err: e instanceof Error ? e.message : String(e) });
    const isRateLimit = e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR;
    return NextResponse.json(
      { error: isRateLimit ? "Rate limit da API Riot. Tente mais tarde." : "Erro ao verificar partidas." },
      { status: isRateLimit ? 503 : 500 }
    );
  }
}
