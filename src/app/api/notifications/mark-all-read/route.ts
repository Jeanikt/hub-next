import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";

/** POST /api/notifications/mark-all-read – marcar todas como lidas (stub) */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({ success: true });
}
