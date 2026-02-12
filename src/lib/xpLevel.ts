/**
 * Curva de XP por nível (nível 1 = 0 XP, nível 2 = 100, etc.).
 * Missões dão XP; ao atingir o total do próximo nível, sobe de nível.
 */

const XP_BASE = 100;
const XP_MULTIPLIER = 1.5;

/** XP total necessário para estar no nível N (acumulado desde nível 1). */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += Math.floor(XP_BASE * Math.pow(XP_MULTIPLIER, i - 2));
  }
  return total;
}

/** Nível atual dado o XP total do usuário. */
export function levelFromXp(totalXp: number): number {
  if (totalXp < 0) return 1;
  for (let level = 100; level >= 1; level--) {
    if (totalXp >= xpRequiredForLevel(level)) return level;
  }
  return 1;
}

/** XP necessário para o próximo nível (a partir do nível atual). */
export function xpToNextLevel(currentLevel: number): number {
  const forCurrent = xpRequiredForLevel(currentLevel);
  const forNext = xpRequiredForLevel(currentLevel + 1);
  return forNext - forCurrent;
}

/** Progresso 0–1 para o próximo nível (dado XP total). */
export function progressToNextLevel(totalXp: number): { level: number; currentXpInLevel: number; xpNeeded: number; progress: number } {
  const level = levelFromXp(totalXp);
  const xpAtLevelStart = xpRequiredForLevel(level);
  const xpAtNextLevel = xpRequiredForLevel(level + 1);
  const xpNeeded = xpAtNextLevel - xpAtLevelStart;
  const currentXpInLevel = totalXp - xpAtLevelStart;
  const progress = xpNeeded <= 0 ? 1 : Math.min(1, currentXpInLevel / xpNeeded);
  return { level, currentXpInLevel, xpNeeded, progress };
}
