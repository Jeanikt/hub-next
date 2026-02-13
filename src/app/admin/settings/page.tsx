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
  const [syncResult, setSyncResult] = useState<{ updated: number; totalWithRiot: number; errors?: { userId: string; reason: string }[] } | null>(null);

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
    setSaving(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (res.ok && data[key] !== undefined) {
        setSettings((s) => (s ? { ...s, [key]: data[key] } : s));
      }
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
          <p className="text-sm font-bold text-[var(--hub-text)]">Controle de partidas e filas</p>
          <p className="text-xs text-[var(--hub-text-muted)] mt-0.5">
            Ative ou desative criação de partidas e entrada em filas.
          </p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)]/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <Gamepad2 size={22} className="text-[var(--hub-accent)]" />
              <div>
                <p className="font-medium text-[var(--hub-text)]">Permitir criação de partidas</p>
                <p className="text-xs text-[var(--hub-text-muted)]">
                  Usuários podem criar partidas custom/competitive/practice.
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
              className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors ${
                settings.allow_custom_matches === "1"
                  ? "border-[var(--hub-accent)] bg-[var(--hub-accent)]"
                  : "border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  settings.allow_custom_matches === "1" ? "left-7" : "left-1"
                }`}
              />
              {saving === "allow_custom_matches" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-white" />
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)]/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <ListOrdered size={22} className="text-[var(--hub-accent)]" />
              <div>
                <p className="font-medium text-[var(--hub-text)]">Desativar filas</p>
                <p className="text-xs text-[var(--hub-text-muted)]">
                  Ninguém pode entrar em filas competitivas enquanto estiver ativado.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={saving === "queues_disabled"}
              onClick={() =>
                update("queues_disabled", settings.queues_disabled === "1" ? "0" : "1")
              }
              className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors ${
                settings.queues_disabled === "1"
                  ? "border-[var(--hub-accent-red)] bg-[var(--hub-accent-red)]"
                  : "border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  settings.queues_disabled === "1" ? "left-7" : "left-1"
                }`}
              />
              {saving === "queues_disabled" && (
                <span className="absolute inset-0 flex items-center justify-center">
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
            <p className="mt-3 text-sm text-[var(--hub-text-muted)]">
              {syncResult.updated} de {syncResult.totalWithRiot} usuários com conta Riot atualizados.
              {syncResult.errors?.length ? ` ${syncResult.errors.length} erro(s).` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
