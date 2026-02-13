import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { getAppSetting, setAppSetting } from "@/src/lib/redis";

const SETTING_KEYS = ["allow_custom_matches", "queues_disabled"] as const;

/** GET /api/admin/settings – ler configurações (apenas admin) */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    const allow_custom_matches = (await getAppSetting("allow_custom_matches")) ?? "0";
    const queues_disabled = (await getAppSetting("queues_disabled")) ?? "0";
    return NextResponse.json({
      allow_custom_matches,
      queues_disabled,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao ler configurações." }, { status: 500 });
  }
}

/** PATCH /api/admin/settings – atualizar configurações (apenas admin). Body: { allow_custom_matches?: "1"|"0", queues_disabled?: "1"|"0" } */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    for (const key of SETTING_KEYS) {
      const v = body[key];
      if (v === "1" || v === "0") await setAppSetting(key, v);
    }
    const allow_custom_matches = (await getAppSetting("allow_custom_matches")) ?? "0";
    const queues_disabled = (await getAppSetting("queues_disabled")) ?? "0";
    return NextResponse.json({
      allow_custom_matches,
      queues_disabled,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar configurações." }, { status: 500 });
  }
}
