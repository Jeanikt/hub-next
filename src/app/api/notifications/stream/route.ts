import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

const SSE_POLL_MS = 8000;
const SSE_MAX_DURATION_MS = 55_000;

/** GET /api/notifications/stream – SSE: uma conexão longa reduz requisições de polling */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(undefined, { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const send = (event: string, data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch {
          closed = true;
        }
      };

      const closeStream = () => {
        if (closed) return;
        closed = true;
        if (timeoutId != null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        try {
          controller.close();
        } catch {
          // controller já fechado
        }
      };

      let lastSeenAt: Date | null = null;
      const deadline = Date.now() + SSE_MAX_DURATION_MS;

      const tick = async () => {
        if (closed) return;
        if (Date.now() >= deadline) {
          closeStream();
          return;
        }
        try {
          const list = await prisma.notification.findMany({
            where: lastSeenAt
              ? { userId, createdAt: { gt: lastSeenAt } }
              : { userId },
            orderBy: { createdAt: "desc" },
            take: lastSeenAt ? 50 : 30,
            select: {
              id: true,
              type: true,
              title: true,
              body: true,
              readAt: true,
              createdAt: true,
            },
          });
          if (!closed && list.length > 0) {
            const newest = list[0];
            if (!lastSeenAt || newest.createdAt > lastSeenAt) lastSeenAt = newest.createdAt;
            const payload = list.map((n) => ({
              id: n.id,
              type: n.type,
              title: n.title,
              body: n.body,
              readAt: n.readAt?.toISOString() ?? null,
              createdAt: n.createdAt.toISOString(),
            }));
            if (payload.length === 1) {
              send("notification", JSON.stringify(payload[0]));
            } else {
              send("list", JSON.stringify(payload));
            }
          }
        } catch {
          if (!closed) send("ping", "{}");
        }
        if (closed) return;
        if (Date.now() < deadline) {
          timeoutId = setTimeout(() => {
            timeoutId = null;
            tick();
          }, SSE_POLL_MS);
        } else {
          closeStream();
        }
      };

      send("ping", "{}");
      timeoutId = setTimeout(() => {
        timeoutId = null;
        tick();
      }, 500);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache",
      Connection: "keep-alive",
    },
  });
}
