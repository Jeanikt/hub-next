import { NextResponse } from "next/server";
import { getPusherClientConfig } from "@/src/lib/pusher";

/** GET /api/pusher/config – retorna key e cluster para o cliente (canal público queue). */
export async function GET() {
  const config = getPusherClientConfig();
  if (!config) {
    return NextResponse.json({ enabled: false }, { status: 200 });
  }
  return NextResponse.json({
    enabled: true,
    key: config.key,
    cluster: config.cluster,
  });
}
