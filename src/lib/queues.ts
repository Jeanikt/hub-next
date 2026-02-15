/**
 * Configuração das filas de partida.
 * Filas 1–4: públicas (low_elo, mid_elo, high_elo, aberta). Fila 5: apenas super admins (2 jogadores).
 */

/** Filas visíveis para todos (10 jogadores, 5v5). */
export const PUBLIC_QUEUE_TYPES = ["low_elo", "mid_elo", "high_elo", "aberta"] as const;

/** 4ª fila: apenas 2 jogadores (1 de cada lado), visível só para jeandev003 e yagobtelles. */
export const FOURTH_QUEUE_TYPE = "test_2v2";

/** Nome exibido da 4ª fila na UI. */
export const FOURTH_QUEUE_DISPLAY_NAME = "Teste 2v2 (2 jogadores)";

/** Quantidade de jogadores para fechar a 4ª fila. */
export const FOURTH_QUEUE_PLAYERS_REQUIRED = 2;

/** Jogadores padrão para fechar partida (5v5). */
export const DEFAULT_PLAYERS_REQUIRED = 10;

/** Todos os tipos de fila (incluindo a 4ª). */
export const ALL_QUEUE_TYPES = [...PUBLIC_QUEUE_TYPES, FOURTH_QUEUE_TYPE] as const;

export type PublicQueueType = (typeof PUBLIC_QUEUE_TYPES)[number];
export type QueueType = PublicQueueType | typeof FOURTH_QUEUE_TYPE;

/** Retorna quantos jogadores são necessários para a partida fechar. */
export function getPlayersRequired(type: string): number {
  return type === FOURTH_QUEUE_TYPE ? FOURTH_QUEUE_PLAYERS_REQUIRED : DEFAULT_PLAYERS_REQUIRED;
}

/** Retorna o nome para exibição da fila. */
export function getQueueDisplayName(type: string): string {
  if (type === FOURTH_QUEUE_TYPE) return FOURTH_QUEUE_DISPLAY_NAME;
  return type.replace("_", " ");
}

/** Cor da fila (border/acento) para UI. */
export const QUEUE_COLORS: Record<string, string> = {
  low_elo: "#22c55e",
  mid_elo: "#3b82f6",
  high_elo: "#a855f7",
  aberta: "#f59e0b",
  test_2v2: "#06b6d4",
};

/** Descrição do ELO aceito na fila. */
export const QUEUE_ELO_DESCRIPTION: Record<string, string> = {
  low_elo: "Até Platina 3",
  mid_elo: "Diamond 1 – Ascendente 3",
  high_elo: "Imortal+",
  aberta: "Qualquer ELO",
  test_2v2: "Teste",
};
