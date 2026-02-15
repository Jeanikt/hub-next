"use client";

import { useEffect, useState } from "react";
import { Gamepad2, XCircle, RotateCcw, Loader2, Trophy } from "lucide-react";

type Match = {
  id: number;
  matchId: string;
  type: string;
  status: string;
  maxPlayers: number;
  playerCount: number;
  creator: { id: string; username: string | null } | null;
  createdAt: string;
};

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [acting, setActing] = useState<number | null>(null);
  const [concludingMatchId, setConcludingMatchId] = useState<string | null>(null);

  const load = (status?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: "20" });
    if (status) params.set("status", status === "completed" ? "finished" : status);
    fetch(`/api/matches?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setMatches(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(statusFilter || undefined);
  }, [statusFilter]);

  const action = async (id: number, action: "cancel" | "restart") => {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (res.ok) load(statusFilter || undefined);
    } finally {
      setActing(null);
    }
  };

  const concludeMatch = async (matchId: string) => {
    setConcludingMatchId(matchId);
    try {
      const res = await fetch(`/api/matches/${matchId}/conclude`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        load(statusFilter || undefined);
      } else {
        alert(data.message || "Não foi possível concluir a partida.");
      }
    } finally {
      setConcludingMatchId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] flex items-center gap-2">
          <Gamepad2 size={28} />
          Partidas
        </h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-3 py-2 text-sm text-[var(--hub-text)]"
        >
          <option value="">Todas</option>
          <option value="pending">Pendentes</option>
          <option value="in_progress">Em andamento</option>
          <option value="completed">Concluídas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-[var(--hub-text-muted)]">
          <div className="hub-loading-spinner h-6 w-6 border-2" />
          Carregando partidas...
        </div>
      ) : matches.length === 0 ? (
        <p className="text-[var(--hub-text-muted)]">Nenhuma partida encontrada.</p>
      ) : (
        <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-bg-elevated)] text-left">
                  <th className="px-4 py-3 font-bold text-[var(--hub-text)]">ID / MatchId</th>
                  <th className="px-4 py-3 font-bold text-[var(--hub-text)]">Tipo</th>
                  <th className="px-4 py-3 font-bold text-[var(--hub-text)]">Status</th>
                  <th className="px-4 py-3 font-bold text-[var(--hub-text)]">Jogadores</th>
                  <th className="px-4 py-3 font-bold text-[var(--hub-text)]">Criador</th>
                  <th className="px-4 py-3 font-bold text-[var(--hub-text)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--hub-border)] last:border-0">
                    <td className="px-4 py-3 text-[var(--hub-text)]">
                      <span className="text-[var(--hub-text-muted)]">{m.id}</span> · {m.matchId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-[var(--hub-text)]">{m.type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          m.status === "completed" || m.status === "finished"
                            ? "bg-green-500/20 text-green-400"
                            : m.status === "cancelled"
                              ? "bg-red-500/20 text-red-400"
                              : m.status === "in_progress"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-[var(--hub-bg-elevated)] text-[var(--hub-text-muted)]"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--hub-text)]">
                      {m.playerCount}/{m.maxPlayers}
                    </td>
                    <td className="px-4 py-3 text-[var(--hub-text)]">
                      {m.creator?.username ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {m.status !== "cancelled" && (
                          <button
                            type="button"
                            disabled={acting === m.id}
                            onClick={() => action(m.id, "cancel")}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[var(--hub-accent-red)] hover:bg-[var(--hub-accent-red)]/20 disabled:opacity-50"
                            title="Cancelar partida"
                          >
                            {acting === m.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                            Cancelar
                          </button>
                        )}
                        {m.status !== "pending" && (
                          <button
                            type="button"
                            disabled={acting === m.id}
                            onClick={() => action(m.id, "restart")}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[var(--hub-accent)] hover:bg-[var(--hub-accent)]/20 disabled:opacity-50"
                            title="Reiniciar (voltar a pendente)"
                          >
                            {acting === m.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                            Reiniciar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {total > 0 && (
        <p className="text-sm text-[var(--hub-text-muted)]">Total: {total} partida(s).</p>
      )}
    </div>
  );
}
