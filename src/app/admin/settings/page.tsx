"use client";

import { useEffect, useState } from "react";
import { Settings, Gamepad2, ListOrdered, Loader2, RefreshCw } from "lucide-react";

type SettingsState = {
  allow_custom_matches: string;
  queues_disabled: string;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    updated: number;
    totalWithRiot: number;
    errors?: { userId: string; username?: string | null; reason: string }[];
  } | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.allow_custom_matches !== undefined) {
          setSettings({
            allow_custom_matches: d.allow_custom_matches ?? "0",
            queues_disabled: d.queues_disabled ?? "0",
          });
        } else setSettings(null);
      })
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const syncElo = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/sync-elo", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({
          updated: data.updated ?? 0,
          totalWithRiot: data.totalWithRiot ?? 0,
          errors: data.errors,
        });
      } else {
        setSyncResult({ updated: 0, totalWithRiot: 0 });
      }
    } catch {
      setSyncResult({ updated: 0, totalWithRiot: 0 });
    } finally {
      setSyncing(false);
    }
  };

  const update = async (key: keyof SettingsState, value: "1" | "0") => {
    const previous = settings ? { ...settings } : null;
    setSettings((s) => (s ? { ...s, [key]: value } : s));
    setSaving(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (res.ok && (data.allow_custom_matches !== undefined || data.queues_disabled !== undefined)) {
        setSettings((s) => (s ? { ...s, ...data } : s));
      } else if (previous) setSettings(previous);
    } catch {
      if (previous) setSettings(previous);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--hub-text-muted)]">
        <div className="hub-loading-spinner h-6 w-6 border-2" />
        Carregando configurações...
      </div>
    );
  }

  if (!settings) {
    return (
      <p className="text-[var(--hub-accent-red)]">Sem permissão ou erro ao carregar.</p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] flex items-center gap-2">
        <Settings size={28} />
        Configurações
      </h1>

      <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] overflow-hidden">
        <div className="border-b border-[var(--hub-border)] px-4 py-3 bg-[var(--hub-bg-elevated)]">
          <p className="text-sm font-bold text-[var(--hub-text)]">Partidas e filas</p>
          <p className="text-xs text-[var(--hub-text-muted)] mt-0.5">
            Liga/desliga criação de partidas e entrada em filas. Estado salvo no servidor.
          </p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)]/80 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Gamepad2 size={22} className="shrink-0 text-[var(--hub-accent)]" />
              <div className="min-w-0">
                <p className="font-medium text-[var(--hub-text)]">Criação de partidas</p>
                <p className="text-xs text-[var(--hub-text-muted)]">
                  {settings.allow_custom_matches === "1"
                    ? "Ativado – usuários podem criar partidas."
                    : "Desativado – apenas admin pode liberar."}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={saving === "allow_custom_matches"}
              onClick={() =>
                update(
                  "allow_custom_matches",
                  settings.allow_custom_matches === "1" ? "0" : "1"
                )
              }
              className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)] focus:ring-offset-2 focus:ring-offset-[var(--hub-bg-card)] ${
                settings.allow_custom_matches === "1"
                  ? "border-[var(--hub-accent)] bg-[var(--hub-accent)]"
                  : "border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]"
              }`}
              aria-checked={settings.allow_custom_matches === "1"}
              role="switch"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  settings.allow_custom_matches === "1" ? "left-7" : "left-1"
                }`}
              />
              {saving === "allow_custom_matches" && (
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                  <Loader2 size={18} className="animate-spin text-white" />
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)]/80 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <ListOrdered size={22} className="shrink-0 text-[var(--hub-accent)]" />
              <div className="min-w-0">
                <p className="font-medium text-[var(--hub-text)]">Filas competitivas</p>
                <p className="text-xs text-[var(--hub-text-muted)]">
                  {settings.queues_disabled === "0"
                    ? "Ativadas – usuários podem entrar na fila."
                    : "Desativadas – ninguém pode entrar na fila."}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={saving === "queues_disabled"}
              onClick={() =>
                update("queues_disabled", settings.queues_disabled === "1" ? "0" : "1")
              }
              className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)] focus:ring-offset-2 focus:ring-offset-[var(--hub-bg-card)] ${
                settings.queues_disabled === "0"
                  ? "border-[var(--hub-accent)] bg-[var(--hub-accent)]"
                  : "border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]"
              }`}
              aria-checked={settings.queues_disabled === "0"}
              role="switch"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  settings.queues_disabled === "0" ? "left-7" : "left-1"
                }`}
              />
              {saving === "queues_disabled" && (
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                  <Loader2 size={18} className="animate-spin text-white" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] overflow-hidden">
        <div className="border-b border-[var(--hub-border)] px-4 py-3 bg-[var(--hub-bg-elevated)]">
          <p className="text-sm font-bold text-[var(--hub-text)]">ELO / Rank (API Riot)</p>
          <p className="text-xs text-[var(--hub-text-muted)] mt-0.5">
            Usuários já começam com pontos baseados no ELO ao vincular a Riot. Use o botão abaixo para atualizar o ELO de todos os usuários existentes com conta Riot.
          </p>
        </div>
        <div className="p-4">
          <button
            type="button"
            disabled={syncing}
            onClick={syncElo}
            className="flex items-center gap-2 rounded-lg border border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-4 py-2.5 text-sm font-medium text-[var(--hub-accent)] hover:bg-[var(--hub-accent)]/30 disabled:opacity-50"
          >
            {syncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            Sincronizar ELO de todos os usuários
          </button>
          {syncResult && (
            <div className="mt-3 space-y-1 text-sm text-[var(--hub-text-muted)]">
              <p>
                {syncResult.updated} de {syncResult.totalWithRiot} usuários com conta Riot atualizados.
                {syncResult.errors?.length ? ` ${syncResult.errors.length} erro(s).` : ""}
              </p>
              {syncResult.errors?.length ? (
                <ul className="list-disc list-inside text-xs">
                  {syncResult.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e.username ?? e.userId}: {e.reason}</li>
                  ))}
                  {syncResult.errors.length > 5 && (
                    <li>… e mais {syncResult.errors.length - 5} erro(s)</li>
                  )}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
