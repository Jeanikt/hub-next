import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/src/lib/serverLog";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

const TROLL_REPORT_THRESHOLD = 5;

/** POST /api/reports – enviar report. gameMatchId opcional: 1 report por usuário por partida. */
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
    const gameMatchId = typeof body.gameMatchId === "number" ? body.gameMatchId : typeof body.gameMatchId === "string" ? parseInt(body.gameMatchId, 10) : undefined;
    if (!reason) {
      return NextResponse.json(
        { message: "Motivo do report é obrigatório." },
        { status: 422 }
      );
    }
    if (gameMatchId != null && !Number.isNaN(gameMatchId)) {
      const existing = await prisma.report.findFirst({
        where: { userId: session.user.id, gameMatchId },
      });
      if (existing) {
        return NextResponse.json(
          { message: "Você já enviou um report nesta partida. Apenas um por partida." },
          { status: 409 }
        );
      }
    }
    await prisma.report.create({
      data: {
        userId: session.user.id,
        targetType,
        targetId: targetId || "unknown",
        reason,
        status: "pending",
        gameMatchId: gameMatchId != null && !Number.isNaN(gameMatchId) ? gameMatchId : null,
      },
    });
    if (targetType === "user" && targetId) {
      const count = await prisma.report.count({
        where: { targetType: "user", targetId },
      });
      if (count >= TROLL_REPORT_THRESHOLD) {
        await prisma.user.update({
          where: { id: targetId },
          data: { profileBadge: "troll" },
        }).catch(() => {});
      }
    }
    return NextResponse.json({ success: true, message: "Report recebido. Nossa equipe analisará em breve." }, { status: 201 });
  } catch (e) {
    serverError("POST /api/reports", "error", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Erro ao enviar report." }, { status: 500 });
  }
}
