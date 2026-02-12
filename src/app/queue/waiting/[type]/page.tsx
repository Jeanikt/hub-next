"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Users, LogOut, CheckCircle2 } from "lucide-react";

type QueueStatus = {
  status?: Record<
    string,
    {
      count: number;
      players: {
        id: number;
        username: string | null;
        elo: number;
        level: number;
        avatar_url?: string | null;
      }[];
    }
  >;
  inQueue: boolean;
  currentQueue: string | null;
  queuePlayers: {
    id: number;
    username: string | null;
    elo: number;
    level: number;
    avatar_url?: string | null;
  }[];
};

export default function WaitingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const type = (params?.type as string) ?? "";
  const [data, setData] = useState<QueueStatus | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [matchFoundAlert, setMatchFoundAlert] = useState(false);
  const pollRef = useRef<() => Promise<void>>();

  useEffect(() => {
    if (!type) return;
    async function poll() {
      const res = await fetch("/api/queue/status", { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      setData(json);
      if (!json.inQueue || json.currentQueue !== type) {
        router.push("/queue");
        return;
      }
      if (json.matchFound && json.matchId) {
        router.push(`/matches/${json.matchId}`);
      }
    }
    pollRef.current = poll;
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [type, router]);

  useEffect(() => {
    const userId = (session?.user as { id?: string })?.id;
    if (!type || !userId) return;
    let client: { unsubscribe: (ch: string) => void } | null = null;
    fetch("/api/pusher/config", { credentials: "include" })
      .then((r) => r.json())
      .then((config) => {
        if (!config?.enabled || !config?.key) return;
        return import("pusher-js").then(({ default: Pusher }) => {
          client = new Pusher(config.key, { cluster: config.cluster });
          const channel = client.subscribe("queue");
          channel.bind("match-found", (payload: { matchId?: string; userIds?: string[] }) => {
            if (payload?.matchId && Array.isArray(payload.userIds) && payload.userIds.includes(userId)) {
              setMatchFoundAlert(true);
              setTimeout(() => router.push(`/matches/${payload.matchId}`), 1500);
            }
          });
          channel.bind("status-update", () => pollRef.current?.());
        });
      });
    return () => {
      if (client) client.unsubscribe("queue");
    };
  }, [type, session?.user, router]);

  async function leaveQueue() {
    setLeaving(true);
    await fetch("/api/queue/leave", { method: "POST", credentials: "include" });
    router.push("/queue");
  }

  const players = data?.queuePlayers ?? data?.status?.[type]?.players ?? [];
  const count = players.length;
  const label = type.replace("_", " ").toUpperCase();

  return (
    <div className="space-y-8">
      {matchFoundAlert && (
        <div className="rounded-2xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 p-5 text-center">
          <p className="text-lg font-bold uppercase tracking-wider text-[var(--hub-accent)]">
            Partida encontrada!
          </p>
          <p className="mt-1 text-sm text-[var(--hub-text-muted)]">Redirecionando para o lobby...</p>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] md:text-3xl">
            Sala de espera
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-[var(--hub-text-muted)]">
            <span className="rounded bg-[var(--hub-accent)]/20 px-2 py-0.5 font-semibold text-[var(--hub-accent)]">
              {label}
            </span>
            · {count}/10 jogadores
          </p>
        </div>
        <button
          onClick={leaveQueue}
          disabled={leaving}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-5 py-2.5 text-sm font-medium text-[var(--hub-text)] hover:bg-[var(--hub-bg-elevated)] disabled:opacity-50"
        >
          <LogOut size={18} />
          {leaving ? "Saindo..." : "Sair da fila"}
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] overflow-hidden hub-animate-slide-up shadow-xl">
        <div className="border-b border-[var(--hub-border)] bg-[var(--hub-bg-elevated)] px-5 py-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
            <Users size={16} />
            Jogadores na fila · Partida inicia quando completar 10
          </p>
        </div>
        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg)]/80 p-3"
              >
                <span className="flex h-2 w-2 shrink-0 rounded-full bg-[var(--hub-accent)]" />
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover border border-[var(--hub-border)]"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--hub-border)] bg-[var(--hub-bg-card)] text-sm font-medium text-[var(--hub-text-muted)]">
                    ?
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--hub-text)]">
                    {p.username ?? `#${p.id}`}
                  </p>
                  <p className="text-xs text-[var(--hub-text-muted)]">
                    ELO {p.elo} · Nível {p.level}
                  </p>
                </div>
                <CheckCircle2 size={18} className="shrink-0 text-[var(--hub-accent)]" />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 10 - count) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center rounded-xl border border-dashed border-[var(--hub-border)] bg-[var(--hub-bg)]/40 p-6"
              >
                <span className="text-xs text-[var(--hub-text-muted)]">Aguardando...</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
