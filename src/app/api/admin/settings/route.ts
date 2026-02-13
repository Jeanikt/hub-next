import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { getAppSetting, setAppSetting, getRedisHealth } from "@/src/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SETTING_KEYS = ["allow_custom_matches", "queues_disabled"] as const;

function to01(v: unknown): "0" | "1" | null {
  if (v === "0" || v === 0) return "0";
  if (v === "1" || v === 1) return "1";
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "0" || t === "1") return t as "0" | "1";
  }
  return null;
}

/** GET /api/admin/settings – ler configurações (apenas admin) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAllowedAdmin(session)) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const health = await getRedisHealth();
  if (!health.ok) {
    return NextResponse.json(
      { message: "Redis não está disponível. Verifique UPSTASH_REDIS_REST_URL/TOKEN.", debug: health },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const allow_custom_matches = (await getAppSetting("allow_custom_matches")) ?? "1";
  const queues_disabled = (await getAppSetting("queues_disabled")) ?? "0";

  return NextResponse.json(
    { allow_custom_matches, queues_disabled, debug: health },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** PATCH /api/admin/settings – atualizar configurações (apenas admin) */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isAllowedAdmin(session)) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const health = await getRedisHealth();
  if (!health.ok) {
    return NextResponse.json(
      { message: "Redis não está disponível. Não foi possível salvar.", debug: health },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const body = await request.json().catch(() => ({}));

  const written: Record<string, "0" | "1" | null> = {};
  for (const key of SETTING_KEYS) {
    const next = to01((body as any)[key]);
    written[key] = next;
    if (next) await setAppSetting(key, next);
  }

  const allow_custom_matches = (await getAppSetting("allow_custom_matches")) ?? "1";
  const queues_disabled = (await getAppSetting("queues_disabled")) ?? "0";

  return NextResponse.json(
    { allow_custom_matches, queues_disabled, debug: { ...health, written } },
    { headers: { "Cache-Control": "no-store" } }
  );
}
