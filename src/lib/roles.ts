/**
 * Funções/posições para fila (Valorant).
 * Cada jogador escolhe uma primária e uma secundária; na formação da partida
 * evita-se duplicar a mesma função primária na mesma fila (ou permite swap).
 */

export const ROLES = [
  { id: "controller", label: "Controlador" },
  { id: "duelist", label: "Duelista" },
  { id: "initiator", label: "Iniciador" },
  { id: "sentinel", label: "Sentinela" },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];

export const ROLE_IDS: RoleId[] = ROLES.map((r) => r.id);

export function isValidRole(value: string | null | undefined): value is RoleId {
  return !!value && ROLE_IDS.includes(value as RoleId);
}

export function getRoleLabel(id: string | null | undefined): string {
  const r = ROLES.find((x) => x.id === id);
  return r?.label ?? id ?? "—";
}
