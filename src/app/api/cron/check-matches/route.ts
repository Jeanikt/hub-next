import { NextRequest, NextResponse } from "next/server";
import { syncPendingMatchesFromRiot } from "@/src/lib/matchSync";
import { VALORANT_RATE_LIMIT_ERROR } from "@/src/lib/valorant";

const CRON_SECRET = process.env.CRON_SECRET ?? process.env.CRON_API_KEY;

/**
 * GET /api/cron/check-matches – verifica partidas pendentes/in_progress e sincroniza
 * com partidas encerradas no Valorant (API Henrik). Protegido por CRON_SECRET.
 * Agende a cada 1–3 min para atualização quase em tempo real das estatísticas ao finalizar.
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
    console.error("cron check-matches", e);
    const isRateLimit = e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR;
    return NextResponse.json(
      { error: isRateLimit ? "Rate limit da API Riot. Tente mais tarde." : "Erro ao verificar partidas." },
      { status: isRateLimit ? 503 : 500 }
    );
  }
}
