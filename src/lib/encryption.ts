/**
 * Criptografia para dados sensíveis (ex.: CPF).
 * Usa AES-256-GCM. Defina ENCRYPTION_KEY (32 bytes em base64) ou usa NEXTAUTH_SECRET.
 * Nunca logue ou exponha dados descriptografados.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SALT = "hub-cpf-v1";

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey && envKey.length >= 32) {
    try {
      const buf = Buffer.from(envKey, "base64");
      if (buf.length === KEY_LEN) return buf;
    } catch {
      // fallback
    }
  }
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-do-not-use-in-production";
  return scryptSync(secret, SALT, KEY_LEN);
}

/**
 * Criptografa um texto. Retorna string em base64 (iv + tag + ciphertext).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv, { authTagLength: TAG_LEN });
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/**
 * Descriptografa uma string produzida por encrypt().
 */
export function decrypt(ciphertextBase64: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertextBase64, "base64");
  if (buf.length < IV_LEN + TAG_LEN) throw new Error("Dados criptografados inválidos");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString("utf8") + decipher.final("utf8");
}

/**
 * Gera hash SHA-256 para uso como índice de unicidade (não reversível).
 */
export function hashForLookup(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
