import { NextRequest, NextResponse } from "next/server";
import { runSyncElo } from "@/src/lib/syncElo";

const CRON_SECRET = process.env.CRON_SECRET ?? process.env.CRON_API_KEY;

/**
 * GET /api/cron/sync-elo – executa sync de ELO de todos os usuários (para cron job).
 * Protegido por CRON_SECRET (ou CRON_API_KEY): ?secret=... ou header Authorization: Bearer ...
 * Configure no Dokploy/Vercel Cron para rodar a cada X horas.
 */
export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "Cron não configurado (CRON_SECRET)." }, { status: 501 });
  }

  const urlSecret = request.nextUrl.searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const provided = urlSecret ?? bearer;

  if (provided !== CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await runSyncElo();
    return NextResponse.json({
      ok: true,
      message: "ELO sincronizado.",
      ...result,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao sincronizar ELO." }, { status: 500 });
  }
}
