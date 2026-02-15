import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI ?? `${process.env.NEXTAUTH_URL}/api/discord/callback`;
  if (!clientId || !redirectUri) {
    return NextResponse.json({ message: "Configuração do Discord incompleta." }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds.join",
    prompt: "consent",
  });


  return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
}