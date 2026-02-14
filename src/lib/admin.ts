/**
 * Acesso admin restrito aos e-mails em ALLOWED_ADMIN_EMAIL (vários separados por vírgula).
 * Ex.: ALLOWED_ADMIN_EMAIL=jeandev003@gmail.com,yagobtelles@gmail.com
 */

const DEFAULT_ADMIN_EMAILS = "jeandev003@gmail.com,yagobtelles@gmail.com,santiagosslemes@gmail.com,pereirawesley.dev@gmail.com";

/** E-mails que podem ver e entrar na fila secreta (teste 2 jogadores). Super admins. */
const SECRET_QUEUE_EMAILS = "jeandev003@gmail.com,yagobtelles@gmail.com";

function getAdminEmailsSet(): Set<string> {
  const raw = process.env.ALLOWED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAILS;
  const list = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return new Set(list);
}

function getSecretQueueEmailsSet(): Set<string> {
  const raw = process.env.SECRET_QUEUE_EMAILS ?? SECRET_QUEUE_EMAILS;
  const list = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return new Set(list);
}

/** True se o usuário pode ver e entrar na fila secreta (apenas super admins). */
export function canSeeSecretQueue(session: { user?: { email?: string | null } } | null): boolean {
  const email = session?.user?.email ?? null;
  if (!email) return false;
  return getSecretQueueEmailsSet().has(email.toLowerCase());
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
