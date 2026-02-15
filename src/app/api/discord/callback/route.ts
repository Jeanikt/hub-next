import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

async function exchangeCode(code: string, redirectUri: string) {
  const params = new URLSearchParams();
  params.append("client_id", process.env.DISCORD_CLIENT_ID ?? "");
  params.append("client_secret", process.env.DISCORD_CLIENT_SECRET ?? "");
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);

  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) throw new Error("Falha ao trocar código do Discord.");
  return res.json();
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ message: "Código ausente." }, { status: 400 });

  const redirectUri = process.env.DISCORD_REDIRECT_URI ?? `${process.env.NEXTAUTH_URL}/api/discord/callback`;
  try {
    const tokenData = await exchangeCode(code, redirectUri);
    const accessToken = tokenData.access_token as string | undefined;
    if (!accessToken) throw new Error("Token não recebido");

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) throw new Error("Falha ao obter usuário do Discord");
    const userJson = await userRes.json();
    const discordId = String(userJson.id ?? "");
    if (!discordId) throw new Error("Discord id não encontrado");

    try {
      await prisma.user.update({ where: { id: session.user.id }, data: { discordId } });
    } catch (e: any) {
      if (e?.code === "P2002") {
        return NextResponse.json({ message: "Este Discord já está vinculado a outro usuário." }, { status: 409 });
      }
      throw e;
    }

    // Redirect back to profile discord page
    return NextResponse.redirect(new URL("/profile/discord", request.url));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Erro ao vincular Discord." }, { status: 500 });
  }
}
