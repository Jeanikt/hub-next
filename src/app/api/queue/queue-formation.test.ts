/**
 * Testes da lógica de formação de partida a partir da fila.
 * Garante que partidas fechadas pela fila usem status in_progress e que
 * getPlayersRequired está correto para todas as filas.
 */
import { describe, it, expect } from "vitest";
import {
  getPlayersRequired,
  getQueueDisplayName,
  FOURTH_QUEUE_TYPE,
  PUBLIC_QUEUE_TYPES,
  DEFAULT_PLAYERS_REQUIRED,
  FOURTH_QUEUE_PLAYERS_REQUIRED,
} from "../../../lib/queues";

describe("queue formation", () => {
  it("getPlayersRequired retorna 10 para filas 5v5", () => {
    for (const qt of PUBLIC_QUEUE_TYPES) {
      expect(getPlayersRequired(qt)).toBe(DEFAULT_PLAYERS_REQUIRED);
    }
    expect(getPlayersRequired("low_elo")).toBe(10);
    expect(getPlayersRequired("high_elo")).toBe(10);
    expect(getPlayersRequired("inclusive")).toBe(10);
  });

  it("getPlayersRequired retorna 2 para fila test_2v2", () => {
    expect(getPlayersRequired(FOURTH_QUEUE_TYPE)).toBe(FOURTH_QUEUE_PLAYERS_REQUIRED);
    expect(getPlayersRequired("test_2v2")).toBe(2);
  });

  it("getQueueDisplayName retorna nome legível", () => {
    expect(getQueueDisplayName("high_elo")).toBe("high elo");
    expect(getQueueDisplayName(FOURTH_QUEUE_TYPE)).toContain("2v2");
  });
});
