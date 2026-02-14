/**
 * Cliente para a API Valorant (Henrik Dev)
 * https://docs.henrikdev.xyz/valorant
 * Rate limit: 30 req/min (básico); uso interno limitado a 28/min.
 */

import { waitForValorantRateLimit, VALORANT_RATE_LIMIT_ERROR } from "@/src/lib/valorantRateLimit";

export { VALORANT_RATE_LIMIT_ERROR };

const BASE_URL = "https://api.henrikdev.xyz/valorant";

function getHeaders(): HeadersInit {
  const key = process.env.VALORANT_API_KEY ?? process.env.VALORANT_KEY;
  return {
    "Content-Type": "application/json",
    ...(key ? { Authorization: key } : {}),
  };
}

/** Fetch com rate limit interno; lança se a API retornar 429. */
async function valorantFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  await waitForValorantRateLimit();
  const res = await fetch(input, init);
  if (res.status === 429) {
    throw new Error(VALORANT_RATE_LIMIT_ERROR);
  }
  return res;
}

export type ValorantMatch = {
  metadata?: { map?: string; mode?: string;[key: string]: unknown };
  players?: unknown[];
  [key: string]: unknown;
};

export type ValorantAccount = {
  data?: {
    puuid?: string;
    name?: string;
    tag?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/** Histórico de partidas por nome#tag (região br, plataforma pc) */
export async function getMatchlist(
  name: string,
  tag: string,
  region = "br",
  platform = "pc"
): Promise<{ data?: ValorantMatch[]; error?: string } | null> {
  try {
    const res = await valorantFetch(
      `${BASE_URL}/v4/matches/${region}/${platform}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      { headers: getHeaders(), next: { revalidate: 300 } }
    );
    if (!res.ok) {
      return { error: `API ${res.status}` };
    }
    const data = await res.json();
    return data;
  } catch (e) {
    if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) throw e;
    console.error("Valorant getMatchlist", e);
    return null;
  }
}

/** Última partida customizada (cache 5min). Para sincronização use getLastCustomMatchFresh. */
export async function getLastCustomMatch(
  name: string,
  tag: string,
  region = "br",
  platform = "pc"
): Promise<{ data?: ValorantMatch | ValorantMatch[]; error?: string } | null> {
  return getLastCustomMatchInternal(name, tag, region, platform, 300);
}

/** Última partida customizada sem cache (para cron de sync). */
export async function getLastCustomMatchFresh(
  name: string,
  tag: string,
  region = "br",
  platform = "pc"
): Promise<{ data?: ValorantMatch | ValorantMatch[]; error?: string } | null> {
  return getLastCustomMatchInternal(name, tag, region, platform, 0);
}

async function getLastCustomMatchInternal(
  name: string,
  tag: string,
  region: string,
  platform: string,
  revalidate: number
): Promise<{ data?: ValorantMatch | ValorantMatch[]; error?: string } | null> {
  try {
    const url = new URL(
      `${BASE_URL}/v4/matches/${region}/${platform}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`
    );
    url.searchParams.set("mode", "custom");
    url.searchParams.set("size", "1");
    const res = await valorantFetch(url.toString(), {
      headers: getHeaders(),
      next: { revalidate },
    });
    if (!res.ok) {
      return { error: `API ${res.status}` };
    }
    const data = await res.json();
    return data;
  } catch (e) {
    if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) throw e;
    console.error("Valorant getLastCustomMatch", e);
    return null;
  }
}

/** Detalhes de uma partida por ID (v4). Retorna metadata, teams (has_won, rounds_won), players (name, tag, team, stats). */
export async function getMatchByMatchId(
  region: string,
  matchId: string
): Promise<{ data?: ValorantMatchDetails; error?: string } | null> {
  try {
    const res = await valorantFetch(
      `${BASE_URL}/v4/match/${region}/${encodeURIComponent(matchId)}`,
      { headers: getHeaders(), next: { revalidate: 0 } }
    );
    if (!res.ok) {
      return { error: `API ${res.status}` };
    }
    const data = await res.json();
    return data;
  } catch (e) {
    if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) throw e;
    console.error("Valorant getMatchByMatchId", e);
    return null;
  }
}

/** Estrutura esperada da resposta v4 match (teams, players com stats) */
export type ValorantMatchDetails = {
  metadata?: {
    matchid?: string;
    match_id?: string;
    game_length?: number;
    game_length_in_ms?: number;
    rounds_played?: number;
    is_completed?: boolean;
    [key: string]: unknown;
  };
  teams?: {
    red?: { has_won?: boolean; rounds_won?: number; rounds_lost?: number;[key: string]: unknown };
    blue?: { has_won?: boolean; rounds_won?: number; rounds_lost?: number;[key: string]: unknown };
  };
  players?: {
    all_players?: Array<{
      puuid?: string;
      name?: string;
      tag?: string;
      team?: string;
      stats?: { kills?: number; deaths?: number; assists?: number; score?: number;[key: string]: unknown };
      [key: string]: unknown;
    }>;
    red?: unknown[];
    blue?: unknown[];
  };
  [key: string]: unknown;
};

/**
 * Dados da conta Riot por nome#tag.
 * API Henrik: 200 + { status: 1, data: { puuid, name, tag } } = sucesso; 404 = conta não encontrada; 429 = rate limit.
 * Nome e tag devem ser enviados exatamente como o usuário informou (ex.: tag "café" com acento).
 */
export async function getAccount(
  name: string,
  tag: string
): Promise<ValorantAccount | null> {
  const encodedName = encodeURIComponent(name.trim());
  const encodedTag = encodeURIComponent(tag.trim());

  async function fetchAccount(version: "v1" | "v2"): Promise<ValorantAccount | null> {
    const basePath = `${BASE_URL}/${version}/account/${encodedName}/${encodedTag}`;
    const url = version === "v2" ? `${basePath}?force=true` : basePath;

    const res = await valorantFetch(url, {
      headers: getHeaders(),
      next: { revalidate: version === "v2" ? 3600 : 0 },
    });

    const body = (await res.json().catch(() => null)) as any;
    if (!res.ok) return null;

    const puuid =
      body?.data?.puuid ?? body?.data?.player?.puuid ?? body?.data?.account?.puuid;

    const status = Number(body?.status);
    const okStatus = status === 200 || status === 1;

    if (!okStatus || !puuid) return null;

    return { data: { ...body.data, puuid } };
  }


  try {
    const result = await fetchAccount("v2");
    if (result) return result;
    return await fetchAccount("v1");
  } catch (e) {
    if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) throw e;
    console.error("Valorant getAccount", e);
    return null;
  }
}

/** Valida se nome#tag existe (usa matchlist como probe) */
export async function validateRiotAccount(name: string, tag: string): Promise<boolean> {
  const data = await getMatchlist(name, tag);
  return data != null && !("error" in data && data.error);
}

/** Resposta MMR v2 – current_data com rank atual. API Henrik retorna currenttier_patched (com underscore). */
export type ValorantMMRData = {
  status?: number;
  data?: {
    name?: string;
    tag?: string;
    current_data?: {
      currenttier?: number;
      /** Nome oficial da API (v2): "Gold 1", "Diamond 2", etc. */
      currenttier_patched?: string;
      /** Fallback se a API retornar sem underscore */
      currenttierpatched?: string;
      elo?: number;
      ranking_in_tier?: number;
      mmr_change_to_last_game?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
};

/** Extrai o label do rank de current_data. Preferir currenttierpatched (sem underscore). */
export function getRankLabelFromMMR(mmr: ValorantMMRData | null): string | null {
  const cur = mmr?.data?.current_data;
  if (!cur) return null;
  const label = (cur.currenttierpatched ?? cur.currenttier_patched) as string | undefined;
  const s = label != null ? String(label).trim() : "";
  if (s === "" || s.toLowerCase() === "unranked") return "Unranked";
  return s;
}

/**
 * Busca MMR/rank atual do jogador (API v2).
 * Região br; retorna rank atual (currenttierpatched) e elo numérico da Riot.
 * API: status 1 = ok; 404/25 = sem MMR (Unranked).
 */
export async function getMMR(
  name: string,
  tag: string,
  region = "br"
): Promise<ValorantMMRData | null> {
  try {
    const res = await valorantFetch(
      `${BASE_URL}/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      { headers: getHeaders(), next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as ValorantMMRData;
    if (data?.status !== undefined && data.status !== 200 && data.status !== 404) return null; return data;
  } catch (e) {
    if (e instanceof Error && e.message === VALORANT_RATE_LIMIT_ERROR) throw e;
    console.error("Valorant getMMR", e);
    return null;
  }
}

const MMR_REGIONS = ["br", "latam", "na"] as const;

/**
 * Busca MMR tentando várias regiões (br, latam, na). Útil quando a conta pode estar em outra região.
 */
export async function getMMRWithRegionFallback(
  name: string,
  tag: string
): Promise<ValorantMMRData | null> {
  for (const region of MMR_REGIONS) {
    const data = await getMMR(name, tag, region);
    const label = getRankLabelFromMMR(data);
    if (label != null && label !== "") return data;
  }
  return null;
}

/**
 * Apelidos anônimos inspirados em Valorant (mapas/callouts) para esconder
 * o nome real dos jogadores na fila / sala de espera.
 */
const VALORANT_ALIASES = [
  "Ascent",
  "Bind",
  "Haven",
  "Split",
  "Lotus",
  "Icebox",
  "Breeze",
  "Fracture",
  "Pearl",
  "Sunset",
  "Abyss",
  "Site A",
  "Site B",
  "Site C",
  "Mid",
  "Heaven",
  "Garage",
  "Tower",
  "Arcade",
];

/** Gera um alias determinístico a partir do id do jogador. */
export function getQueueAliasFromId(id: string | number): string {
  const s = String(id);
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  const index = hash % VALORANT_ALIASES.length;
  return VALORANT_ALIASES[index];
}

