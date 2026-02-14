import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

/** POST /api/reports – enviar report */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const targetType = (typeof body.targetType === "string" ? body.targetType : body.target_type)?.trim() || "user";
    const targetId = (typeof body.targetId === "string" ? body.targetId : body.target_id)?.trim() || "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) {
      return NextResponse.json(
        { message: "Motivo do report é obrigatório." },
        { status: 422 }
      );
    }
    await prisma.report.create({
      data: {
        userId: session.user.id,
        targetType,
        targetId: targetId || "unknown",
        reason,
        status: "pending",
      },
    });
    return NextResponse.json({ success: true, message: "Report recebido. Nossa equipe analisará em breve." }, { status: 201 });
  } catch (e) {
    serverError("POST /api/reports", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao enviar report." }, { status: 500 });
  }
}
