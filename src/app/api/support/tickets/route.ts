import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

/** GET /api/support/tickets – listar tickets do usuário logado */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ data: tickets, total: tickets.length });
  } catch (e) {
    console.error("support tickets list", e);
    return NextResponse.json({ error: "Erro ao listar tickets." }, { status: 500 });
  }
}

/** POST /api/support/tickets – criar ticket */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const ticketBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!subject || !ticketBody) {
      return NextResponse.json(
        { message: "Assunto e mensagem são obrigatórios." },
        { status: 422 }
      );
    }
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.user.id,
        subject,
        body: ticketBody,
        status: "open",
      },
      select: { id: true, subject: true, status: true, createdAt: true },
    });
    return NextResponse.json({ success: true, ...ticket }, { status: 201 });
  } catch (e) {
    console.error("support ticket create", e);
    return NextResponse.json({ error: "Erro ao criar ticket." }, { status: 500 });
  }
}
