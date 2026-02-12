import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "@/src/lib/valorant";

/** GET /api/valorant/account?name=xxx&tag=yyy – dados da conta Riot */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const tag = request.nextUrl.searchParams.get("tag");
  if (!name || !tag) {
    return NextResponse.json(
      { error: "Parâmetros name e tag são obrigatórios." },
      { status: 422 }
    );
  }
  const data = await getAccount(name, tag);
  if (data == null) {
    return NextResponse.json(
      { error: "Falha ao consultar API Valorant." },
      { status: 502 }
    );
  }
  return NextResponse.json(data);
}
