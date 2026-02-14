"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users,
  ChevronRight,
  Clock,
  Swords,
  Sparkles,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { getQueueAliasFromId } from "@/src/lib/valorant";
import { getQueueDisplayName, getPlayersRequired } from "@/src/lib/queues";
import { requestNotificationPermission } from "@/src/lib/useNotificationSound";

type QueuePlayer = {
  id: string;
  username: string | null;
  elo: number | null;
  primary_role: string | null;
  secondary_role: string | null;
  level: number | null;
  avatar_url: string | null;
  joined_at: number;
};

type QueueStatus = {
  status: Record<
    string,
    {
      count: number;
      players_needed: number;
      estimated_time: string;
      required?: number;
      players: QueuePlayer[];
    }
  >;
  inQueue: boolean;
  currentQueue: string | null;
  queuePlayers: QueuePlayer[];
  hasRiotLinked?: boolean;
  allowed_queues?: string[];
  matchFound?: boolean;
  matchId?: string | null;
};

export default function QueuePage() {
  const router = useRouter();
  const [data, setData] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/queue/status", {
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json: QueueStatus = await res.json();

      if (json.matchFound && json.matchId) {
        router.push(`/matches/${json.matchId}`);
        return;
      }

      setData(json);
      setError(null);
    } catch {
      setError("Erro ao carregar status da fila.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  async function joinQueue(queueType: string) {
    setJoining(queueType);
    setError(null);

    try {
      const res = await fetch("/api/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ queue_type: queueType }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message || "Erro ao entrar na fila.");
        return;
      }

      if (json.matchFound && json.matchId) {
        router.push(`/matches/${json.matchId}`);
        return;
      }

      requestNotificationPermission().catch(() => {});
      router.push(`/queue/waiting/${queueType}`);
    } catch {
      setError("Erro ao entrar na fila.");
    } finally {
      setJoining(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] clip-card">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-[var(--hub-accent)]" />
          <p className="text-sm text-[var(--hub-text-muted)]">Carregando filas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] flex items-center gap-2">
          <Swords size={28} className="text-[var(--hub-accent)]" />
          Filas
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
          Escolha uma fila e entre na partida
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {data?.inQueue && data.currentQueue && (
        <div className="rounded-2xl border-2 border-[var(--hub-accent)]/50 bg-[var(--hub-accent)]/10 p-6 clip-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--hub-accent)]/20">
                <Users size={24} className="text-[var(--hub-accent)]" />
              </span>
              <div>
                <p className="font-bold text-[var(--hub-text)]">Você está na fila</p>
                <p className="text-lg font-black uppercase tracking-wider text-[var(--hub-accent)]">
                  {getQueueDisplayName(data.currentQueue)}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/queue/waiting/${data.currentQueue}`)}
              className="rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent)] transition hover:bg-[var(--hub-accent)] hover:text-white flex items-center gap-2 clip-button"
            >
              Ver sala de espera
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data?.status ?? {}).map(([key, st]) => {
          const required = st.required ?? getPlayersRequired(key);
          const progress = required > 0 ? Math.min(100, (st.count / required) * 100) : 0;
          const canJoin = !data?.inQueue && data?.hasRiotLinked && data.allowed_queues?.includes(key);
          const isJoining = joining === key;

          return (
            <div
              key={key}
              className="group relative overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6 clip-card transition-all duration-300 hover:border-[var(--hub-accent)]/40 hover:shadow-[0_0_24px_var(--hub-accent)]/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--hub-accent)]/5 via-transparent to-[var(--hub-accent-cyan)]/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--hub-accent)]/20">
                    <Sparkles size={22} className="text-[var(--hub-accent)]" />
                  </span>
                  <span className="rounded-lg bg-[var(--hub-bg-elevated)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
                    {st.count}/{required}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-black uppercase tracking-tight text-[var(--hub-text)]">
                  {getQueueDisplayName(key)}
                </h2>
                <div className="mt-3 flex items-center gap-2 text-sm text-[var(--hub-text-muted)]">
                  <Clock size={16} />
                  <span>{st.estimated_time}</span>
                </div>
                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--hub-bg)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--hub-accent)] to-[var(--hub-accent-cyan)] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2 max-h-24 overflow-y-auto">
                  {st.players.slice(0, 10).map((p) => (
                    <div
                      key={p.id}
                      className="text-xs text-[var(--hub-text-muted)] truncate rounded bg-[var(--hub-bg)]/60 px-2 py-1"
                    >
                      {getQueueAliasFromId(p.id)}
                    </div>
                  ))}
                </div>
                {canJoin && (
                  <button
                    onClick={() => joinQueue(key)}
                    disabled={!!joining}
                    className="mt-5 w-full rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-4 py-3 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent)] transition hover:bg-[var(--hub-accent)] hover:text-white disabled:opacity-50 flex items-center justify-center gap-2 clip-button"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        Entrar na fila
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
