/**
 * Cliente para a API Valorant (Henrik Dev)
 * https://docs.henrikdev.xyz/valorant
 */

const BASE_URL = "https://api.henrikdev.xyz/valorant";

function getHeaders(): HeadersInit {
  const key = process.env.VALORANT_API_KEY ?? process.env.VALORANT_KEY;
  return {
    "Content-Type": "application/json",
    ...(key ? { Authorization: key } : {}),
  };
}

export type ValorantMatch = {
  metadata?: { map?: string; mode?: string; [key: string]: unknown };
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
    const res = await fetch(
      `${BASE_URL}/v4/matches/${region}/${platform}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      { headers: getHeaders(), next: { revalidate: 300 } }
    );
    if (!res.ok) {
      return { error: `API ${res.status}` };
    }
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Valorant getMatchlist", e);
    return null;
  }
}

/** Última partida customizada */
export async function getLastCustomMatch(
  name: string,
  tag: string,
  region = "br",
  platform = "pc"
): Promise<{ data?: ValorantMatch; error?: string } | null> {
  try {
    const url = new URL(
      `${BASE_URL}/v4/matches/${region}/${platform}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`
    );
    url.searchParams.set("mode", "custom");
    url.searchParams.set("size", "1");
    const res = await fetch(url.toString(), {
      headers: getHeaders(),
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return { error: `API ${res.status}` };
    }
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Valorant getLastCustomMatch", e);
    return null;
  }
}

/** Dados da conta Riot por nome#tag */
export async function getAccount(
  name: string,
  tag: string
): Promise<ValorantAccount | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      { headers: getHeaders(), next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Valorant getAccount", e);
    return null;
  }
}

/** Valida se nome#tag existe (usa matchlist como probe) */
export async function validateRiotAccount(name: string, tag: string): Promise<boolean> {
  const data = await getMatchlist(name, tag);
  return data != null && !("error" in data && data.error);
}

/** Resposta MMR v2 – current_data com rank atual */
export type ValorantMMRData = {
  status?: number;
  data?: {
    name?: string;
    tag?: string;
    current_data?: {
      currenttier?: number;
      currenttier_patched?: string;
      elo?: number;
      ranking_in_tier?: number;
      mmr_change_to_last_game?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
};

/**
 * Busca MMR/rank atual do jogador (API v2).
 * Região br; retorna rank atual (currenttier_patched) e elo numérico da Riot.
 */
export async function getMMR(
  name: string,
  tag: string,
  region = "br"
): Promise<ValorantMMRData | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      { headers: getHeaders(), next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Valorant getMMR", e);
    return null;
  }
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

