/**
 * Google Analytics 4 – helpers para eventos.
 * Só envia se window.gtag e NEXT_PUBLIC_GA_MEASUREMENT_ID estiverem definidos.
 * Não inclui dados sensíveis (sem PII, sem CPF, sem e-mail).
 */

declare global {
  interface Window {
    gtag?: (command: "event" | "config", ...args: unknown[]) => void;
  }
}

/** Definido em build (NEXT_PUBLIC_GA_MEASUREMENT_ID). No client está disponível; no server é undefined. */
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function safeGtag(...args: Parameters<NonNullable<typeof window.gtag>>) {
  if (typeof window === "undefined" || !window.gtag || !GA_MEASUREMENT_ID) return;
  window.gtag(...args);
}

/** Evento genérico GA4 (sem dados sensíveis). */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  safeGtag("event", name, params);
}

/** Login iniciado (provedor). */
export function trackLogin(method: string) {
  trackEvent("login", { method });
}

/** Cadastro concluído (após onboarding). */
export function trackSignUp(method: string) {
  trackEvent("sign_up", { method });
}

/** Usuário entrou na fila. */
export function trackQueueJoin(queueType: string) {
  trackEvent("queue_join", { queue_type: queueType });
}

/** Usuário saiu da fila. */
export function trackQueueLeave(queueType: string) {
  trackEvent("queue_leave", { queue_type: queueType });
}

/** Partida criada (fila ou manual). */
export function trackMatchCreate(type: string, fromQueue: boolean) {
  trackEvent("match_create", { match_type: type, from_queue: String(fromQueue) });
}

/** Perfil editado (sem enviar conteúdo). */
export function trackProfileUpdate() {
  trackEvent("profile_update");
}

/** Página de termos visualizada. */
export function trackTermsView() {
  trackEvent("terms_view");
}

/** Início do onboarding. */
export function trackOnboardingStart() {
  trackEvent("onboarding_start");
}

/** Conclusão do onboarding. */
export function trackOnboardingComplete() {
  trackEvent("onboarding_complete");
}

/** Clique em link externo (ex.: Riot). */
export function trackOutboundLink(url: string, label?: string) {
  trackEvent("click", { outbound_url: url, link_label: label ?? "outbound" });
}
