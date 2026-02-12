import { describe, expect, it } from "vitest";
import { levelFromXp, progressToNextLevel, xpRequiredForLevel, xpToNextLevel } from "./xpLevel";

describe("xpLevel helpers", () => {
  it("retorna 0 XP para nível 1", () => {
    expect(xpRequiredForLevel(1)).toBe(0);
  });

  it("nível nunca é menor que 1", () => {
    expect(levelFromXp(-10)).toBe(1);
  });

  it("nível aumenta com mais XP", () => {
    const lvl1 = levelFromXp(0);
    const lvl2 = levelFromXp(200);
    expect(lvl2).toBeGreaterThanOrEqual(lvl1);
  });

  it("xpToNextLevel é consistente com xpRequiredForLevel", () => {
    const current = 5;
    const diff = xpRequiredForLevel(current + 1) - xpRequiredForLevel(current);
    expect(xpToNextLevel(current)).toBe(diff);
  });

  it("progressToNextLevel retorna progresso entre 0 e 1", () => {
    const { progress, progressPercent } = progressToNextLevel(150);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
    expect(progressPercent).toBeGreaterThanOrEqual(0);
    expect(progressPercent).toBeLessThanOrEqual(100);
  });
});

