import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

/** POST /api/notifications/mark-all-read – marcar todas como lidas */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
