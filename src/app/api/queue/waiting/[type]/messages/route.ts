import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { ALL_QUEUE_TYPES } from "@/src/lib/queues";

const MAX_MESSAGES = 80;
const MAX_CONTENT_LENGTH = 500;

type Params = { params: Promise<{ type: string }> };

/** GET – lista mensagens do chat da sala de espera (sem expor autor; usuários anônimos) */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const { type } = await params;
    if (!type || !ALL_QUEUE_TYPES.includes(type)) {
      return NextResponse.json({ message: "Tipo de fila inválido." }, { status: 422 });
    }

    const inQueue = await prisma.queueEntry.findUnique({
      where: { userId: session.user.id },
      select: { queueType: true },
    });
    if (!inQueue || inQueue.queueType !== type) {
      return NextResponse.json({ message: "Você não está nesta fila." }, { status: 403 });
    }

    const messages = await prisma.queueWaitingMessage.findMany({
      where: { queueType: type },
      orderBy: { createdAt: "asc" },
      take: MAX_MESSAGES,
      select: { content: true, createdAt: true },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("queue waiting messages GET", e);
    return NextResponse.json(
      { message: "Erro ao carregar mensagens." },
      { status: 500 }
    );
  }
}

/** POST – envia mensagem no chat (autor não é exposto) */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const { type } = await params;
    if (!type || !ALL_QUEUE_TYPES.includes(type)) {
      return NextResponse.json({ message: "Tipo de fila inválido." }, { status: 422 });
    }

    const inQueue = await prisma.queueEntry.findUnique({
      where: { userId: session.user.id },
      select: { queueType: true },
    });
    if (!inQueue || inQueue.queueType !== type) {
      return NextResponse.json({ message: "Você não está nesta fila." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const content =
      typeof body.content === "string"
        ? body.content.trim().slice(0, MAX_CONTENT_LENGTH)
        : "";

    if (!content) {
      return NextResponse.json(
        { message: "Envie content (texto da mensagem)." },
        { status: 422 }
      );
    }

    await prisma.queueWaitingMessage.create({
      data: {
        queueType: type,
        userId: session.user.id,
        content,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("queue waiting messages POST", e);
    return NextResponse.json(
      { message: "Erro ao enviar mensagem." },
      { status: 500 }
    );
  }
}
