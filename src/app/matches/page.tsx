"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Swords, Plus, ChevronRight, Users } from "lucide-react";

type MatchItem = {
  id: number;
  matchId: string;
  type: string;
  status: string;
  maxPlayers: number;
  playerCount: number;
  creator: { id: string; username: string | null } | null;
  createdAt: string;
  map?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando",
  in_progress: "Em andamento",
  completed: "Concluída",
};

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createType, setCreateType] = useState<"custom" | "competitive" | "practice">("custom");
  const [filterStatus, setFilterStatus] = useState<string>("");

  useEffect(() => {
    const params = filterStatus ? `?status=${encodeURIComponent(filterStatus)}` : "";
    fetch(`/api/matches${params}`)
      .then((r) => r.json())
      .then((d) => setMatches(d.data ?? []))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [filterStatus]);

  async function createMatch() {
    setCreating(true);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: createType }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (json.matchId) router.push(`/matches/${json.matchId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--hub-accent)]">
          Partidas
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">
          Partidas
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1">
          Partidas em andamento e aguardando. Use a fila para matchmaking automático.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-3 py-2 text-sm text-[var(--hub-text)] focus:border-[var(--hub-accent)] focus:outline-none clip-button"
          >
            <option value="">Todas</option>
            <option value="pending">Aguardando</option>
            <option value="in_progress">Em andamento</option>
            <option value="completed">Concluídas</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={createType}
            onChange={(e) => setCreateType(e.target.value as "custom" | "competitive" | "practice")}
            className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-3 py-2 text-sm text-[var(--hub-text)] focus:border-[var(--hub-accent)] focus:outline-none clip-button"
          >
            <option value="custom">Custom</option>
            <option value="competitive">Competitiva</option>
            <option value="practice">Prática</option>
          </select>
          <button
            onClick={createMatch}
            disabled={creating}
            className="flex items-center gap-2 rounded-lg border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent)] hover:bg-[var(--hub-accent)] hover:text-white disabled:opacity-50 clip-button"
          >
            <Plus size={18} />
            {creating ? "Criando..." : "Criar partida"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)]">
          <div className="hub-loading-spinner" />
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/matches/${m.matchId}`}
              className="block rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 transition hover:border-[var(--hub-accent)]/50"
              style={{ borderTopWidth: "2px", borderTopColor: "var(--hub-accent)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--hub-accent)]/20">
                    <Swords size={24} className="text-[var(--hub-accent)]" />
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[var(--hub-text)]">
                      {m.type}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-[var(--hub-text-muted)]">
                      <Users size={14} />
                      {m.playerCount}/{m.maxPlayers} jogadores
                      {m.creator?.username && (
                        <>
                          <span className="text-[var(--hub-border)]">·</span>
                          Criador: {m.creator.username}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                      m.status === "pending"
                        ? "bg-amber-500/20 text-amber-400"
                        : m.status === "in_progress"
                          ? "bg-[var(--hub-accent-cyan)]/20 text-[var(--hub-accent-cyan)]"
                          : "bg-[var(--hub-accent)]/20 text-[var(--hub-accent)]"
                    }`}
                  >
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                  <ChevronRight size={20} className="text-[var(--hub-text-muted)]" />
                </div>
              </div>
            </Link>
          ))}
          {matches.length === 0 && (
            <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-12 text-center">
              <Swords size={48} className="mx-auto text-[var(--hub-text-muted)]/50" />
              <p className="mt-4 text-[var(--hub-text-muted)]">Nenhuma partida no momento.</p>
              <p className="mt-1 text-sm text-[var(--hub-text-muted)]">
                Crie uma partida ou entre na fila para matchmaking.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
