import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type DiscordTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

type DiscordMeResponse = {
  id?: string;
  username?: string;
  global_name?: string | null;
  discriminator?: string;
  avatar?: string | null;
};

async function exchangeCode(code: string, redirectUri: string) {
  const clientId = process.env.DISCORD_CLIENT_ID ?? "";
  const clientSecret = process.env.DISCORD_CLIENT_SECRET ?? "";

  if (!clientId || !clientSecret) {
    throw new Error("DISCORD_CLIENT_ID/SECRET ausentes.");
  }

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);

  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao trocar código do Discord: ${res.status} ${text}`);
  }

  return (await res.json()) as DiscordTokenResponse;
}

async function fetchDiscordMe(accessToken: string) {
  const res = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao obter usuário do Discord: ${res.status} ${text}`);
  }

  return (await res.json()) as DiscordMeResponse;
}

async function addMemberToGuild(params: {
  guildId: string;
  botToken: string;
  discordId: string;
  userAccessToken: string;
}) {
  const { guildId, botToken, discordId, userAccessToken } = params;

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: userAccessToken }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`guilds.join falhou: ${res.status} ${text}`);
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { message: `OAuth do Discord cancelado: ${error}` },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json({ message: "Código ausente." }, { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI ?? `${baseUrl}/api/discord/callback`;

  if (!redirectUri) {
    return NextResponse.json(
      { message: "DISCORD_REDIRECT_URI / NEXTAUTH_URL ausente." },
      { status: 500 }
    );
  }

  try {
    const tokenData = await exchangeCode(code, redirectUri);
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("Token não recebido do Discord.");
    }

    const me = await fetchDiscordMe(accessToken);
    const discordId = String(me.id ?? "");

    if (!discordId) {
      throw new Error("Discord id não encontrado.");
    }

    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          discordId,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        return NextResponse.json(
          { message: "Este Discord já está vinculado a outro usuário." },
          { status: 409 }
        );
      }
      throw e;
    }

    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (guildId && botToken) {
      try {
        await addMemberToGuild({
          guildId,
          botToken,
          discordId,
          userAccessToken: accessToken,
        });
      } catch (err) {
        console.warn(err);
      }
    }

    const redirectBase =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;

    return NextResponse.redirect(
      new URL("/profile/discord", redirectBase ?? "https://hubexpresso.com")
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Erro ao vincular Discord." },
      { status: 500 }
    );
  }
}