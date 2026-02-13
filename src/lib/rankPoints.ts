/**
 * Pontuação por elo no formato GC (HUBEXPRESSO).
 * Ninguém começa do 0: o usuário parte do rank atual da Riot.
 * Valores 0–20 para uso em filas e ranking.
 */

export const RANK_POINTS = {
  radiant: 20,
  "immortal 3": 19,
  "immortal 2": 18,
  "immortal 1": 17,
  "ascendant 3": 16,
  "ascendant 2": 15,
  "ascendant 1": 14,
  "diamond 3": 13,
  "diamond 2": 12,
  "diamond 1": 11,
  "platinum 3": 10,
  "platinum 2": 9,
  "platinum 1": 8,
  "gold 3": 7,
  "gold 2": 6,
  "gold 1": 5,
  "silver 3": 4,
  "silver 2": 3,
  "silver 1": 2,
  "bronze 3": 1,
  "bronze 2": 1,
  "bronze 1": 1,
  "iron 3": 0,
  "iron 2": 0,
  "iron 1": 0,
  unranked: 0,
} as const;

export type RankKey = keyof typeof RANK_POINTS;

/** Normaliza "Gold 1", "Diamond 2", "Radiant" etc. para chave do mapa */
function normalizeTierPatched(patched: string): RankKey | null {
  const s = patched
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!s) return null;
  if (s === "radiant") return "radiant";
  if (s === "unranked") return "unranked";
  const key = s as RankKey;
  if (key in RANK_POINTS) return key;
  // Platinum pode vir como "Plat 1"
  const plat = s.replace(/^plat\s/, "platinum ");
  const platKey = plat as RankKey;
  if (platKey in RANK_POINTS) return platKey;
  return null;
}

/**
 * Converte o rank retornado pela API (ex: "Gold 1", "Diamond 2") em pontos 0–20.
 * Se não reconhecer, retorna 0 (ferro).
 */
export function getRankPointsFromTier(patchedTier: string | null | undefined): number {
  if (!patchedTier || typeof patchedTier !== "string") return 0;
  const key = normalizeTierPatched(patchedTier);
  if (key == null) return 0;
  return RANK_POINTS[key];
}

/**
 * Retorna label amigável do rank a partir dos pontos (para exibição).
 */
export function getRankLabelFromPoints(points: number): string {
  const entry = (Object.entries(RANK_POINTS) as [RankKey, number][])
    .filter(([, v]) => v === points)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))[0];
  if (!entry) return points <= 0 ? "Ferro" : points >= 20 ? "Radiante" : `Rank ${points}`;
  const [key] = entry;
  return key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Pontos máximos para fila Low ELO (até Platina 1 = 8). Quem tem 0–8 pode entrar. */
export const LOW_ELO_MAX_POINTS = 8;

/** Pontos mínimos para fila High ELO (Diamante 1+ = 11). Quem tem 11–20 pode entrar. */
export const HIGH_ELO_MIN_POINTS = 11;

/**
 * Verifica se o usuário (pelos pontos de rank) pode entrar na fila.
 */
export function canJoinQueue(
  queueType: "low_elo" | "high_elo" | "inclusive",
  rankPoints: number
): boolean {
  switch (queueType) {
    case "low_elo":
      return rankPoints <= LOW_ELO_MAX_POINTS;
    case "high_elo":
      return rankPoints >= HIGH_ELO_MIN_POINTS;
    case "inclusive":
      return true;
    default:
      return false;
  }
}

/** Lista de filas que o usuário pode entrar dado seu rank (pontos). */
export function getAllowedQueues(rankPoints: number): ("low_elo" | "high_elo" | "inclusive")[] {
  const allowed: ("low_elo" | "high_elo" | "inclusive")[] = ["inclusive"];
  if (rankPoints <= LOW_ELO_MAX_POINTS) allowed.push("low_elo");
  if (rankPoints >= HIGH_ELO_MIN_POINTS) allowed.push("high_elo");
  return allowed;
}
