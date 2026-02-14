/**
 * Gera e valida códigos de convite únicos.
 */

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem I,O para evitar confusão
const DIGITS = "0123456789";

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/** Código da partida no formato ZMB553 (3 letras + 3 números). */
export function generateMatchCode(): string {
  let letters = "";
  for (let i = 0; i < 3; i++) {
    letters += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  let digits = "";
  for (let i = 0; i < 3; i++) {
    digits += DIGITS[Math.floor(Math.random() * DIGITS.length)];
  }
  return letters + digits;
}

/** Gera um código amigável a partir do username (ex: JEAN -> JEAN-XXXX) ou aleatório */
export function codeFromUsername(username: string | null | undefined): string {
  if (username && /^[a-zA-Z0-9_-]+$/.test(username) && username.length >= 2) {
    const base = username.toUpperCase().replace(/-/g, "").slice(0, 6);
    const suffix = generateInviteCode().slice(0, 4);
    return `${base}-${suffix}`;
  }
  return generateInviteCode();
}

export const XP_PER_REFERRAL = 100;
export const REFERRAL_MISSION_TITLE = "Convide 10 amigos";
export const REFERRAL_MISSION_REQUIRED_COUNT = 10;
