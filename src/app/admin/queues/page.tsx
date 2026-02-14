"use client";

import { useEffect, useState } from "react";
import { Users, Trash2, Loader2, RotateCcw } from "lucide-react";

type QueueEntry = {
  type: string;
  count: number;
  players_needed: number;
  players: { id: string; username: string | null; email: string | null; elo: number; rank: string | null; joinedAt: string }[];
};

export default function AdminQueuesPage() {
  const [data, setData] = useState<QueueEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/queues", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const clearQueue = async (queueType?: string) => {
    const key = queueType ?? "all";
    setClearing(key);
    try {
      const res = await fetch("/api/admin/queues/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(queueType ? { queueType } : {}),
      });
      if (res.ok) load();
    } finally {
      setClearing(null);
    }
  };

  const resetAll = async () => {
    if (!confirm("Zerar todas as filas e cancelar todas as partidas pendentes/em andamento? Isso não desfaz partidas já concluídas.")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset-queues-and-matches", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        load();
        alert(json.message ?? "Feito. Filas zeradas e partidas canceladas.");
      } else {
        alert(json.message ?? json.error ?? "Erro ao executar.");
      }
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <p className="text-[var(--hub-text-muted)]">Carregando filas...</p>;
  }

  if (!data) {
    return <p className="text-red-400">Erro ao carregar ou sem permissão.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">
          Filas competitivas
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={clearing === "all" || data.every((q) => q.count === 0)}
            onClick={() => clearQueue()}
            className="flex items-center gap-2 rounded-lg border border-[var(--hub-accent-red)] bg-[var(--hub-bg-card)] px-3 py-2 text-sm font-medium text-[var(--hub-accent-red)] hover:bg-[var(--hub-accent-red)]/10 disabled:opacity-50"
          >
            {clearing === "all" ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Esvaziar todas
          </button>
          <button
            type="button"
            disabled={resetting}
            onClick={resetAll}
            className="flex items-center gap-2 rounded-lg border-2 border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-500 hover:bg-amber-500/20 disabled:opacity-50"
            title="Zerar todas as filas e cancelar partidas pendentes/em andamento"
          >
            {resetting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            Começar do zero
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {data.map((q) => (
          <div
            key={q.type}
            className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] overflow-hidden"
          >
            <div className="border-b border-[var(--hub-border)] bg-[var(--hub-bg-elevated)] px-4 py-3 flex items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wider text-[var(--hub-text)]">
                {q.type.replace("_", " ")}
              </span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm text-[var(--hub-accent)]">
                  <Users size={18} />
                  {q.count}/5 · faltam {q.players_needed}
                </span>
                <button
                  type="button"
                  disabled={clearing === q.type || clearing === "all" || q.count === 0}
                  onClick={() => clearQueue(q.type)}
                  className="rounded p-1.5 text-[var(--hub-text-muted)] hover:bg-[var(--hub-accent-red)]/20 hover:text-[var(--hub-accent-red)] disabled:opacity-50"
                  title="Esvaziar esta fila"
                >
                  {clearing === q.type ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
            <div className="p-3">
              {q.players.length === 0 ? (
                <p className="text-sm text-[var(--hub-text-muted)] py-2">Nenhum jogador na fila.</p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {q.players.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)]/80 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-[var(--hub-text)] truncate">
                        {p.username ?? p.email ?? p.id}
                      </span>
                      <span className="text-[var(--hub-text-muted)] shrink-0">
                        ELO {p.elo} · {p.rank ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
