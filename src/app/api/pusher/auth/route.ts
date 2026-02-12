import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { getPusherServer } from "@/src/lib/pusher";

const CHANNEL_PREFIX = "private-notifications-";

/** POST /api/pusher/auth – autoriza canal privado de notificações (socket_id, channel_name) */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.formData().catch(() => null);
  const socketId = body?.get("socket_id")?.toString();
  const channelName = body?.get("channel_name")?.toString();

  if (!socketId?.trim() || !channelName?.trim()) {
    return NextResponse.json(
      { message: "socket_id e channel_name são obrigatórios." },
      { status: 422 }
    );
  }

  const expectedChannel = `${CHANNEL_PREFIX}${session.user.id}`;
  if (channelName !== expectedChannel) {
    return NextResponse.json(
      { message: "Canal não autorizado." },
      { status: 403 }
    );
  }

  const pusher = await getPusherServer();
  if (!pusher) {
    return NextResponse.json(
      { message: "Pusher não configurado." },
      { status: 503 }
    );
  }

  try {
    const authPayload = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authPayload);
  } catch (e) {
    console.error("Pusher auth", e);
    return NextResponse.json({ message: "Erro ao autorizar." }, { status: 500 });
  }
}
