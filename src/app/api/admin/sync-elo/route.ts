import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { runSyncElo } from "@/src/lib/syncElo";

/** POST /api/admin/sync-elo – atualiza elo e rank de todos os usuários com conta Riot pela API. Apenas admin. */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const result = await runSyncElo();
    return NextResponse.json({
      message: "ELO/rank atualizados pela API Riot.",
      totalWithRiot: result.totalWithRiot,
      updated: result.updated,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao sincronizar ELO." }, { status: 500 });
  }
}
