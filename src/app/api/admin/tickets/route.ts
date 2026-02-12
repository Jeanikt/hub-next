import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import { prisma } from "@/src/lib/prisma";

/** GET /api/admin/tickets – listar todos os tickets (admin) */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAllowedAdmin(session)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, name: true, email: true },
        },
      },
    });
    const data = tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      body: t.body,
      status: t.status,
      createdAt: t.createdAt,
      user: t.user,
    }));
    return NextResponse.json({ data, total: data.length });
  } catch (e) {
    console.error("admin tickets", e);
    return NextResponse.json({ error: "Erro ao listar tickets." }, { status: 500 });
  }
}
