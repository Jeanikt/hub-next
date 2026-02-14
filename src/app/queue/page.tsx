"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users,
  ChevronRight,
  ListOrdered,
  Clock,
  Swords,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { getQueueAliasFromId } from "@/src/lib/valorant";
import { getQueueDisplayName } from "@/src/lib/queues";

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

      // 🔥 se já caiu em partida (ex: abriu /queue depois de fechar 10)
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

      router.push(`/queue/waiting/${queueType}`);
    } catch {
      setError("Erro ao entrar na fila.");
    } finally {
      setJoining(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-red-400 text-sm border border-red-500/30 p-3 rounded">
          {error}
        </div>
      )}

      {data?.inQueue && data.currentQueue && (
        <div className="border border-green-500/40 p-4 rounded">
          Você está na fila{" "}
          <strong>{getQueueDisplayName(data.currentQueue)}</strong>
          <div className="mt-3">
            <button
              onClick={() =>
                router.push(`/queue/waiting/${data.currentQueue}`)
              }
              className="px-4 py-2 bg-green-600 rounded text-white"
            >
              Ver sala de espera
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data?.status ?? {}).map(([key, st]) => (
          <div
            key={key}
            className="border border-[var(--hub-border)] p-5 rounded"
          >
            <h2 className="font-bold uppercase">
              {getQueueDisplayName(key)}
            </h2>

            <p className="mt-2 text-sm">
              {st.count}/{st.required ?? 10} jogadores
            </p>

            {!data?.inQueue &&
              data?.hasRiotLinked &&
              data.allowed_queues?.includes(key) && (
                <button
                  onClick={() => joinQueue(key)}
                  disabled={!!joining}
                  className="mt-3 w-full px-4 py-2 bg-[var(--hub-accent)] rounded text-white"
                >
                  {joining === key ? "Entrando..." : "Entrar na fila"}
                </button>
              )}

            <div className="mt-4 space-y-2">
              {st.players.slice(0, 10).map((p) => (
                <div key={p.id} className="text-xs">
                  {getQueueAliasFromId(p.id)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
