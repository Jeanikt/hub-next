"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfileDiscordPage() {
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setDiscordId(d.discordId ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-xl mx-auto">
      <header className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--hub-accent)]">Discord</p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] md:text-3xl">Vincular Discord</h1>
        <p className="mt-1 text-sm text-[var(--hub-text-muted)]">Vincule sua conta do Discord para facilitar identificação.</p>
      </header>

      <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl clip-card" style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}>
        {loading ? (
          <div className="text-center">Carregando…</div>
        ) : (
          <div className="space-y-6">
            {discordId ? (
              <div>
                <p className="text-sm text-[var(--hub-text-muted)]">Discord vinculado:</p>
                <p className="font-mono mt-2">{discordId}</p>
                <p className="text-xs text-[var(--hub-text-muted)] mt-2">Se quiser trocar a conta vinculada, clique em "Vincular Discord" novamente.</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--hub-text-muted)]">Nenhum Discord vinculado.</p>
            )}

            <div className="flex gap-3">
              <a href="/api/discord/link" className="px-4 py-3 bg-[var(--hub-accent)] text-white font-bold rounded-lg">Vincular Discord</a>
              <Link href="/profile/edit" className="px-4 py-3 border border-[var(--hub-border)] rounded-lg text-[var(--hub-text-muted)]">Voltar</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
