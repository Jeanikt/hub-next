import { describe, it, expect } from "vitest";
import { getRankPointsFromTier } from "./rankPoints";

/**
 * Resposta típica da API Henrik v2/mmr (ex.: santvlr#cafe).
 * Documentação: https://docs.henrikdev.xyz/valorant/api-reference/mmr
 */
const MOCK_MMR_RESPONSE = {
  status: 200,
  data: {
    name: "santvlr",
    tag: "cafe",
    current_data: {
      currenttier: 14,
      currenttier_patched: "Gold 2",
      elo: 1450,
      ranking_in_tier: 45,
      mmr_change_to_last_game: 12,
    },
  },
};

const MOCK_MMR_RESPONSE_ALT = {
  data: {
    current_data: {
      currenttier_patched: "Diamond 1",
    },
  },
};

describe("Valorant MMR – extração de rank e pontos", () => {
  it("extrai currenttier_patched de data.current_data", () => {
    const rankLabel =
      (MOCK_MMR_RESPONSE as { data?: { current_data?: { currenttier_patched?: string } } }).data
        ?.current_data?.currenttier_patched ?? null;
    expect(rankLabel).toBe("Gold 2");
    expect(getRankPointsFromTier(rankLabel)).toBe(6);
  });

  it("extrai rank de resposta alternativa e mapeia para pontos", () => {
    const rankLabel =
      (MOCK_MMR_RESPONSE_ALT as { data?: { current_data?: { currenttier_patched?: string } } })
        .data?.current_data?.currenttier_patched ?? null;
    expect(rankLabel).toBe("Diamond 1");
    expect(getRankPointsFromTier(rankLabel)).toBe(11);
  });

  it("retorna 0 quando current_data ou currenttier_patched estão ausentes", () => {
    const empty = { data: {} };
    const rankLabel = (empty as { data?: { current_data?: { currenttier_patched?: string } } }).data
      ?.current_data?.currenttier_patched ?? null;
    expect(rankLabel).toBeNull();
    expect(getRankPointsFromTier(rankLabel)).toBe(0);
  });
});
