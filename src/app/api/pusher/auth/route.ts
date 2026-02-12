import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";

/** POST /api/pusher/auth – desativado (real-time por polling, sem Pusher). */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json(
    { message: "Pusher não configurado." },
    { status: 503 }
  );
}
