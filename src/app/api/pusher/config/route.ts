import { NextResponse } from "next/server";

/** GET /api/pusher/config – desativado (real-time por polling, sem Pusher). */
export async function GET() {
  return NextResponse.json({ enabled: false }, { status: 200 });
}
