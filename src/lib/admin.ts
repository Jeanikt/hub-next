/**
 * Acesso admin restrito ao e-mail configurado em ALLOWED_ADMIN_EMAIL.
 * Apenas esse usuário pode ver e gerenciar o painel admin.
 */

const ALLOWED_ADMIN_EMAIL = process.env.ALLOWED_ADMIN_EMAIL ?? "jeandev003@gmail.com";

export function getAllowedAdminEmail(): string {
  return ALLOWED_ADMIN_EMAIL;
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ALLOWED_ADMIN_EMAIL.toLowerCase();
}

export function isAllowedAdmin(session: { user?: { email?: string | null } } | null): boolean {
  return isAllowedAdminEmail(session?.user?.email ?? null);
}
