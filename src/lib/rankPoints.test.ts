import { describe, it, expect } from "vitest";
import { getRankPointsFromTier } from "./rankPoints";

describe("getRankPointsFromTier", () => {
  it("converte Gold 1 em 5 pontos", () => {
    expect(getRankPointsFromTier("Gold 1")).toBe(5);
  });

  it("converte Diamond 2 em 12 pontos", () => {
    expect(getRankPointsFromTier("Diamond 2")).toBe(12);
  });

  it("converte Platinum 1 em 8 pontos", () => {
    expect(getRankPointsFromTier("Platinum 1")).toBe(8);
  });

  it("aceita Plat 1 como Platinum 1", () => {
    expect(getRankPointsFromTier("Plat 1")).toBe(8);
  });

  it("converte Radiant em 20 pontos", () => {
    expect(getRankPointsFromTier("Radiant")).toBe(20);
  });

  it("converte Iron 1 em 0 pontos", () => {
    expect(getRankPointsFromTier("Iron 1")).toBe(0);
  });

  it("retorna 0 para string vazia ou null/undefined", () => {
    expect(getRankPointsFromTier("")).toBe(0);
    expect(getRankPointsFromTier(null)).toBe(0);
    expect(getRankPointsFromTier(undefined)).toBe(0);
  });

  it("retorna 0 para rank desconhecido", () => {
    expect(getRankPointsFromTier("Unknown Rank")).toBe(0);
    expect(getRankPointsFromTier("santvlr")).toBe(0);
  });

  it("é case insensitive", () => {
    expect(getRankPointsFromTier("gOLD 1")).toBe(5);
    expect(getRankPointsFromTier("radiant")).toBe(20);
  });
});
