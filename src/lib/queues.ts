/**
 * Configuração das filas de partida.
 * Filas 1–3: públicas (low_elo, high_elo, inclusive). Fila 4: apenas super admins (2 jogadores).
 */

/** Filas visíveis para todos (10 jogadores, 5v5). */
export const PUBLIC_QUEUE_TYPES = ["low_elo", "mid_elo", "high_elo", "inclusive"] as const;

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
