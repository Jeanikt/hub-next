"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Match = {
  matchId: string;
  type: string;
  status: string;
  maxPlayers: number;
  playerCount: number;
  isFull: boolean;
  userInMatch: boolean;
  isCreator?: boolean;
  creator: { id: number; username: string | null; name: string | null } | null;
  participants: { team: string | null; role: string | null; user: { id: number; username: string | null; name: string | null; elo: number; rank: string | null } }[];
};

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.matchId as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    fetch(`/api/matches/${matchId}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setMatch)
      .catch(() => setMatch(null))
      .finally(() => setLoading(false));
  }, [matchId]);

  async function joinMatch() {
    setJoining(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/join`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (res.ok) window.location.reload();
      else alert(json.message || "Erro ao entrar.");
    } finally {
      setJoining(false);
    }
  }

  async function cancelMatch() {
    if (!confirm("Cancelar esta partida?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) router.push("/matches");
      else alert((await res.json()).message || "Erro ao cancelar.");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)]">
        <div className="hub-loading-spinner" />
      </div>
    );
  }
  if (!match) {
    return (
      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-8 text-center">
        <p className="text-[var(--hub-text-muted)]">Partida não encontrada.</p>
        <Link href="/matches" className="mt-4 inline-block text-[var(--hub-accent)] hover:underline">← Voltar</Link>
      </div>
    );
  }

  const isCreator = match.isCreator === true;
  const red = match.participants.filter((p) => p.team === "red");
  const blue = match.participants.filter((p) => p.team === "blue");

  return (
    <div className="space-y-6">
      <Link href="/matches" className="text-sm text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)]">
        ← Voltar às partidas
      </Link>

      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6 clip-card" style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-[var(--hub-text)]">
              Partida {match.type} · {match.status}
            </h1>
            <p className="text-sm text-[var(--hub-text-muted)] mt-1">
              {match.playerCount}/{match.maxPlayers} jogadores
              {match.creator && ` · Criador: ${match.creator.username ?? match.creator.name ?? "—"}`}
            </p>
          </div>
          <div className="flex gap-2">
            {!match.userInMatch && match.status === "pending" && !match.isFull && (
              <button
                onClick={joinMatch}
                disabled={joining}
                className="rounded-lg border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-4 py-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent)] hover:bg-[var(--hub-accent)] hover:text-white disabled:opacity-50 clip-button"
              >
                {joining ? "Entrando..." : "Entrar na partida"}
              </button>
            )}
            {match.userInMatch && isCreator && match.status === "pending" && (
              <button
                onClick={cancelMatch}
                disabled={cancelling}
                className="rounded-lg border border-[var(--hub-accent-red)]/50 px-4 py-2 text-sm font-medium text-[var(--hub-accent-red)] hover:bg-[var(--hub-accent-red)]/10 disabled:opacity-50"
              >
                {cancelling ? "Cancelando..." : "Cancelar partida"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]/50 p-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent-red)]">Time Red</h2>
            <ul className="space-y-1">
              {red.map((p) => (
                <li key={p.user.id} className="text-sm text-[var(--hub-text)]">
                  {p.user.username ?? p.user.name ?? `#${p.user.id}`} · ELO {p.user.elo}
                  {p.role && p.role !== "creator" && ` · ${p.role}`}
                  {p.role === "creator" && " (criador)"}
                </li>
              ))}
              {red.length < 5 &&
                Array.from({ length: 5 - red.length }).map((_, i) => (
                  <li key={`r-${i}`} className="text-[var(--hub-text-muted)]">— vaga</li>
                ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]/50 p-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent-cyan)]">Time Blue</h2>
            <ul className="space-y-1">
              {blue.map((p) => (
                <li key={p.user.id} className="text-sm text-[var(--hub-text)]">
                  {p.user.username ?? p.user.name ?? `#${p.user.id}`} · ELO {p.user.elo}
                  {p.role && p.role !== "creator" && ` · ${p.role}`}
                </li>
              ))}
              {blue.length < 5 &&
                Array.from({ length: 5 - blue.length }).map((_, i) => (
                  <li key={`b-${i}`} className="text-[var(--hub-text-muted)]">— vaga</li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
