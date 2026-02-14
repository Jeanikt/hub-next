#!/usr/bin/env node
/**
 * Chama /api/cron/check-matches com CRON_SECRET do ambiente.
 * Uso no agendador (Docker/cron): node scripts/cron-check-matches.js
 * Requer: CRON_SECRET e BASE_URL (ou default https://www.hubexpresso.com)
 *
 * Não quebra se a resposta for HTML (ex.: página "The deployment is in progress").
 */
const secret = process.env.CRON_SECRET || process.env.CRON_API_KEY;
const baseUrl = (process.env.BASE_URL || "https://www.hubexpresso.com").replace(/\/$/, "");
const url = `${baseUrl}/api/cron/check-matches?secret=${encodeURIComponent(secret || "")}`;

if (!secret) {
  console.error("CRON_SECRET (ou CRON_API_KEY) não definido no ambiente.");
  process.exit(1);
}

fetch(url, { method: "GET" })
  .then((r) => {
    const contentType = r.headers.get("content-type") || "";
    return r.text().then((text) => ({ ok: r.ok, status: r.status, contentType, text }));
  })
  .then(({ ok, status, contentType, text }) => {
    if (status === 401) {
      console.error("Cron: Não autorizado (secret incorreto ou não enviado).");
      process.exit(1);
    }
    if (!ok) {
      console.error("Cron: HTTP", status, text.slice(0, 200));
      process.exit(1);
    }
    if (!contentType.includes("application/json")) {
      console.warn("Cron: Resposta não é JSON (possível deploy/manutenção):", text.slice(0, 80) + "...");
      process.exit(0); // não falhar o agendador
    }
    try {
      const data = JSON.parse(text);
      console.log("Cron check-matches:", data.message || data);
      if (data.updated !== undefined) console.log("Partidas atualizadas:", data.updated);
      process.exit(0);
    } catch {
      console.warn("Cron: Resposta JSON inválida:", text.slice(0, 80) + "...");
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error("Cron: Erro de rede:", err.message);
    process.exit(1);
  });
