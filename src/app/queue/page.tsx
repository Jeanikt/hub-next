"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Users, ChevronRight, ListOrdered, Clock, Swords, Sparkles } from "lucide-react";
import Link from "next/link";
import { getQueueAliasFromId } from "@/src/lib/valorant";
import { trackQueueJoin } from "@/src/lib/analytics";

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
      players: QueuePlayer[];
    }
  >;
  inQueue: boolean;
  currentQueue: string | null;
  queuePlayers: QueuePlayer[];
  hasRiotLinked?: boolean;
  allowed_queues?: string[];
};

const QUEUE_TYPES = [
  {
    id: "low_elo",
    label: "FILA LOW ELO",
    desc: "Até Gold (pontos 0–7). Disponível para todos os elos iniciais.",
    color: "from-[#0d9488]/30 to-[#0d9488]/5",
    borderColor: "border-teal-500/40",
    accent: "text-teal-400",
  },
  {
    id: "high_elo",
    label: "FILA HIGH ELO",
    desc: "Plat ou acima (pontos 8–20). Do Diamond ao Radiante.",
    color: "from-[var(--hub-accent-red)]/25 to-[var(--hub-accent-red)]/5",
    borderColor: "border-red-500/40",
    accent: "text-red-400",
  },
  {
    id: "inclusive",
    label: "FILA INCLUSIVA",
    desc: "Todos os ranks. Partidas mistas.",
    color: "from-[var(--hub-accent)]/20 to-[var(--hub-accent)]/5",
    borderColor: "border-[var(--hub-accent)]/40",
    accent: "text-[var(--hub-accent)]",
  },
] as const;

const PLAYERS_NEEDED = 5;

function PlayerChip({ p, position }: { p: QueuePlayer; position: number }) {
  const alias = getQueueAliasFromId(p.id);
  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)]/90 px-2.5 py-2"
      key={p.id}
    >
      <span className="text-[10px] font-mono text-[var(--hub-text-muted)] w-4">{position}</span>
      <div className="h-7 w-7 rounded-full border border-[var(--hub-border)] bg-[var(--hub-bg-card)] flex items-center justify-center text-[10px] text-[var(--hub-text-muted)]">
        ?
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--hub-text)]">
          {alias}
        </p>
        <p className="text-[10px] text-[var(--hub-text-muted)]">
          ELO {p.elo ?? "—"} · Nível {p.level ?? "—"}
        </p>
      </div>
    </div>
  );
}

export default function QueuePage() {
  const router = useRouter();
  const [data, setData] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchStatusRef = useRef<(() => Promise<void>) | undefined>(undefined);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/queue/status", { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError("Erro ao carregar status da fila.");
    } finally {
      setLoading(false);
    }
  }

  fetchStatusRef.current = fetchStatus;

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
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
      trackQueueJoin(queueType);
      if (json.matchFound && json.matchId) {
        router.push(`/matches/${json.matchId}`);
        return;
      }
      router.push(`/queue/waiting/${queueType}`);
    } catch {
      setError("Erro ao entrar na fila.");
    } finally {
      setJoining(null);
    }
  }

  async function leaveQueue() {
    setLeaving(true);
    setError(null);
    try {
      const res = await fetch("/api/queue/leave", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) setError(json.message ?? "Erro ao sair.");
      else await fetchStatus();
    } catch {
      setError("Erro ao sair da fila.");
    } finally {
      setLeaving(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] clip-card">
        <div className="text-center">
          <div className="hub-loading-spinner mx-auto mb-4" />
          <p className="text-sm font-medium text-[var(--hub-text-muted)]">Carregando filas...</p>
          <p className="mt-1 text-xs text-[var(--hub-text-muted)]/80">Atualização em tempo real</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--hub-accent)]">
          Matchmaking
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] md:text-3xl flex items-center gap-2">
          Escolha sua fila
          <ChevronRight className="text-[var(--hub-accent)] hidden sm:block" size={28} />
        </h1>
        <p className="mt-1 text-sm text-[var(--hub-text-muted)] max-w-xl">
          Sua fila é liberada pelo rank da sua conta Riot. Dados atualizados em tempo real.
        </p>
      </header>

      {data?.hasRiotLinked === false && (
        <div className="rounded-2xl border border-[var(--hub-accent)]/50 bg-[var(--hub-accent)]/10 p-6 clip-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--hub-accent)]/20 p-2">
              <Swords className="text-[var(--hub-accent)]" size={24} />
            </div>
            <div>
              <p className="font-semibold text-[var(--hub-text)]">Conta Riot necessária</p>
              <p className="mt-1 text-sm text-[var(--hub-text-muted)]">
                Vincule sua conta Riot no perfil para liberar as filas e entrar em partidas.
              </p>
            </div>
          </div>
          <Link
            href="/profile/edit"
            className="shrink-0 rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)] px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:opacity-90 transition clip-button"
          >
            Ir ao perfil
          </Link>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl border border-[var(--hub-accent-red)]/50 bg-[var(--hub-accent-red)]/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {data?.inQueue && data.currentQueue && (
        <div className="rounded-2xl border border-[var(--hub-accent)]/50 bg-[var(--hub-accent)]/10 p-6 clip-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-[var(--hub-accent)] animate-pulse" />
            <p className="text-[var(--hub-text)]">
              Você está na fila <strong className="text-[var(--hub-accent)]">{data.currentQueue.replace("_", " ")}</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(`/queue/waiting/${data.currentQueue}`)}
              className="rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)] px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:opacity-90 transition clip-button"
            >
              Ver sala de espera
            </button>
            <button
              type="button"
              onClick={leaveQueue}
              disabled={leaving}
              className="rounded-xl border border-[var(--hub-border)] px-4 py-2.5 text-sm text-[var(--hub-text)] hover:bg-[var(--hub-bg-card)] disabled:opacity-50 transition clip-button"
            >
              {leaving ? "Saindo..." : "Sair da fila"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {QUEUE_TYPES.map((q) => {
          const st = data?.status?.[q.id];
          const count = st?.count ?? 0;
          const needed = st?.players_needed ?? PLAYERS_NEEDED;
          const time = st?.estimated_time ?? "—";
          const players = st?.players ?? [];
          const canJoin = data?.hasRiotLinked && data?.allowed_queues?.includes(q.id);
          const showButton = !data?.inQueue && canJoin;

          return (
            <article
              key={q.id}
              className={`rounded-2xl border ${q.borderColor} bg-[var(--hub-bg-card)] bg-gradient-to-b ${q.color} overflow-hidden clip-card transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1`}
            >
              <div className="p-6">
                <h2 className={`font-black uppercase tracking-wider ${q.accent}`}>
                  {q.label}
                </h2>
                <p className="mt-2 text-sm text-[var(--hub-text-muted)]">{q.desc}</p>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-2 text-[var(--hub-text)]">
                    <Users size={18} className="text-[var(--hub-accent)]" />
                    <strong className="text-[var(--hub-accent)]">{count}</strong> na fila
                  </span>
                  <span className="flex items-center gap-1.5 text-[var(--hub-text-muted)]">
                    <Clock size={14} />
                    ~{time}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--hub-text-muted)]">
                  Partida inicia com {needed} jogadores
                </p>

                {!data?.inQueue && (
                  <div className="mt-5">
                    {!data?.hasRiotLinked && (
                      <p className="text-xs text-[var(--hub-text-muted)]">
                        Vincule a conta Riot no perfil para entrar.
                      </p>
                    )}
                    {data?.hasRiotLinked && !canJoin && (
                      <p className="text-xs text-[var(--hub-text-muted)]">
                        Seu rank não permite esta fila no momento.
                      </p>
                    )}
                    {showButton && (
                      <button
                        type="button"
                        onClick={() => joinQueue(q.id)}
                        disabled={!!joining}
                        className="mt-2 w-full rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 py-3.5 text-sm font-black uppercase tracking-wider text-white transition hover:bg-[var(--hub-accent)] hover:border-[var(--hub-accent)] disabled:opacity-50 clip-button flex items-center justify-center gap-2"
                      >
                        {joining === q.id ? (
                          "Entrando..."
                        ) : (
                          <>
                            <Sparkles size={18} />
                            Entrar na fila
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--hub-border)] bg-[var(--hub-bg)]/50 p-4">
                <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
                  <ListOrdered size={12} />
                  Na fila ({players.length})
                </p>
                {players.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-xs text-[var(--hub-text-muted)]">Ninguém ainda.</p>
                    <p className="mt-1 text-xs font-medium text-[var(--hub-accent)]">Seja o primeiro!</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto">
                    {players.slice(0, 12).map((p, i) => (
                      <PlayerChip key={p.id} p={p} position={i + 1} />
                    ))}
                    {players.length > 12 && (
                      <span className="text-[10px] text-[var(--hub-text-muted)] self-center px-1">
                        +{players.length - 12}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
