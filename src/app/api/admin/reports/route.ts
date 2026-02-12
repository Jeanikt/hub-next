import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { prisma } from "@/src/lib/prisma";

/** GET /api/admin/reports – listar reports (admin) */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, name: true, email: true },
        },
      },
    });
    const data = reports.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      user: r.user,
    }));
    return NextResponse.json({ data, total: data.length });
  } catch (e) {
    console.error("admin reports", e);
    return NextResponse.json({ error: "Erro ao listar reports." }, { status: 500 });
  }
}
