"use client";

import { useEffect, useState } from "react";
import { Users, ListOrdered } from "lucide-react";

type QueueEntry = {
  type: string;
  count: number;
  players_needed: number;
  players: { id: string; username: string | null; email: string | null; elo: number; rank: string | null; joinedAt: string }[];
};

export default function AdminQueuesPage() {
  const [data, setData] = useState<QueueEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/queues", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-[var(--hub-text-muted)]">Carregando filas...</p>;
  }

  if (!data) {
    return <p className="text-red-400">Erro ao carregar ou sem permissão.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">
        Filas competitivas
      </h1>
      <div className="grid gap-4 md:grid-cols-3">
        {data.map((q) => (
          <div
            key={q.type}
            className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] overflow-hidden"
          >
            <div className="border-b border-[var(--hub-border)] bg-[var(--hub-bg-elevated)] px-4 py-3 flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[var(--hub-text)]">
                {q.type.replace("_", " ")}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[var(--hub-accent)]">
                <Users size={18} />
                {q.count}/10 · faltam {q.players_needed}
              </span>
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
