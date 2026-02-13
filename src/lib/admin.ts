/**
 * Acesso admin restrito aos e-mails em ALLOWED_ADMIN_EMAIL (vários separados por vírgula).
 * Ex.: ALLOWED_ADMIN_EMAIL=jeandev003@gmail.com,yagobtelles@gmail.com
 */

const DEFAULT_ADMIN_EMAILS = "jeandev003@gmail.com,yagobtelles@gmail.com";

function getAdminEmailsSet(): Set<string> {
  const raw = process.env.ALLOWED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAILS;
  const list = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return new Set(list);
}

export function getAllowedAdminEmail(): string {
  const raw = process.env.ALLOWED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAILS;
  return raw.split(",")[0]?.trim() ?? "";
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmailsSet().has(email.toLowerCase());
}

export function isAllowedAdmin(session: { user?: { email?: string | null } } | null): boolean {
  return isAllowedAdminEmail(session?.user?.email ?? null);
}
