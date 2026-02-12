import { NextRequest, NextResponse } from "next/server";
import { getMatchlist } from "@/src/lib/valorant";

/** GET /api/valorant/matchlist?name=xxx&tag=yyy – histórico de partidas (API Valorant) */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const tag = request.nextUrl.searchParams.get("tag");
  if (!name || !tag) {
    return NextResponse.json(
      { error: "Parâmetros name e tag são obrigatórios." },
      { status: 422 }
    );
  }
  const data = await getMatchlist(name, tag);
  if (data == null) {
    return NextResponse.json(
      { error: "Falha ao consultar API Valorant." },
      { status: 502 }
    );
  }
  if ("error" in data && data.error) {
    return NextResponse.json({ error: data.error }, { status: 502 });
  }
  return NextResponse.json(data);
}
