import { NextRequest, NextResponse } from "next/server";
import { parseCpf } from "@/src/lib/cpf";

/**
 * POST /api/validate-cpf – validação algorítmica do CPF (formato + dígitos).
 * Futuro: consultar API externa para verificar se CPF existe (ver docs/CPF_VALIDATION_API.md).
 * Não loga nem retorna o CPF; apenas valid.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const raw = typeof body.cpf === "string" ? body.cpf : "";
    const normalized = parseCpf(raw);
    return NextResponse.json({ valid: normalized !== null });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
