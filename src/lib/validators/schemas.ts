import { z } from "zod";

/** Tipos de fila permitidos */
export const queueTypeSchema = z.enum(["low_elo", "high_elo", "inclusive"]);

/** Tipo de partida (criação) */
export const matchTypeSchema = z.enum(["custom", "competitive", "practice"]);

export const joinQueueSchema = z.object({
  queue_type: queueTypeSchema,
});

export const createMatchSchema = z.object({
  type: matchTypeSchema,
});

const cuidSchema = z.string().min(1).max(128);

export const addFriendSchema = z
  .object({
    username: z.string().min(1).max(100).optional(),
    friend_id: cuidSchema.optional(),
  })
  .refine((d) => d.username != null || d.friend_id != null, {
    message: "Envie username ou friend_id",
  });

/** Accept/reject: id do registro Friend (número) no body */
export const friendAcceptRejectSchema = z.object({
  friend_id: z.coerce.number().int().positive().optional(),
  id: z.coerce.number().int().positive().optional(),
}).refine((d) => d.friend_id != null || d.id != null, {
  message: "friend_id ou id é obrigatório",
});

export const removeFriendSchema = z.object({
  friend_id: cuidSchema,
});

export const sendFriendMessageSchema = z.object({
  receiver_id: z.string().min(1).max(128),
  content: z.string().trim().min(1).max(10_000),
});

/** friend_id = userId (cuid) do amigo cujas mensagens serão marcadas como lidas */
export const markReadFriendSchema = z.object({
  friend_id: z.string().min(1).max(128),
});

export const sendLobbyMessageSchema = z.object({
  matchId: z.string().min(1).max(128),
  content: z.string().trim().min(1).max(2_000),
});

/** Durações de suspensão em milissegundos (10m, 1h, 4h, 24h, 7d) */
export const BAN_DURATION_MS = {
  "10m": 10 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
} as const;

export const adminBanSchema = z.object({
  reason: z.string().min(1).max(500).default("Violação das regras"),
  permanent: z.boolean().optional(),
  duration: z.enum(["10m", "1h", "4h", "24h", "7d"]).optional(),
  banned_until: z.string().datetime().optional().nullable(),
});

/** String com 11 dígitos (CPF normalizado); validação de dígitos verificadores feita no backend. */
export const cpfRawSchema = z
  .string()
  .min(1, "CPF é obrigatório")
  .transform((s) => s.replace(/\D/g, ""))
  .refine((s) => s.length === 11, "CPF deve ter 11 dígitos");

export const onboardingProfileSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/, "Apenas letras, números e _"),
  cpf: cpfRawSchema,
});

/**
 * Normaliza Riot ID: aceita "Nome#Tag" em um campo ou nome e tag em dois.
 * Retorna { name, tag } ou null se inválido.
 */
export function parseRiotIdAndTag(
  riotId: string,
  tagline: string
): { name: string; tag: string } | null {
  const r = (riotId ?? "").trim();
  const t = (tagline ?? "").trim();
  if (r.includes("#")) {
    const idx = r.indexOf("#");
    const name = r.slice(0, idx).trim();
    const tagFromR = r.slice(idx + 1).trim();
    const tag = tagFromR || t;
    if (name.length >= 2 && tag.length >= 1 && tag.length <= 10) return { name, tag };
    return null;
  }
  if (r.length >= 2 && t.length >= 1 && t.length <= 10) return { name: r, tag: t };
  return null;
}

/** Aceita Nome#Tag no primeiro campo (tagline vazio) ou nome e tag em dois campos. */
export const onboardingRiotIdSchema = z
  .object({
    riotId: z.string().min(1, "Informe o nome ou Nome#Tag").max(100).trim(),
    tagline: z.string().max(10).trim().optional().default(""),
  })
  .transform((data) => {
    const parsed = parseRiotIdAndTag(data.riotId, data.tagline ?? "");
    if (parsed) return { riotId: parsed.name, tagline: parsed.tag };
    return data;
  })
  .refine(
    (data) => {
      const parsed = parseRiotIdAndTag(data.riotId, data.tagline ?? "");
      return parsed != null && parsed.name.length >= 2 && parsed.tag.length >= 1 && parsed.tag.length <= 10;
    },
    { message: "Use Nome#Tag (ex: Avestruz#001) no primeiro campo e deixe o segundo vazio, ou preencha os dois campos." }
  );
