import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";

/** GET /api/notifications – listar notificações do usuário (stub) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({ data: [] });
}
