"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trophy, Clock, Star, Loader2 } from "lucide-react";

type Match = {
  matchId: string;
  type: string;
  status: string;
  map?: string | null;
  maxPlayers: number;
  playerCount: number;
  isFull: boolean;
  userInMatch: boolean;
  isCreator?: boolean;
  isAdmin?: boolean;
  finishedAt?: string | null;
  winnerTeam?: string | null;
  matchDuration?: number | null;
  settings?: { mvpUserId?: string; match_code?: string } | null;
  creator: { id: string; username: string | null; name: string | null } | null;
  participants: {
    userId: string;
    team: string | null;
    role: string | null;
    kills: number;
    deaths: number;
    assists: number;
    score: number;
    user: {
      id: string;
      username: string | null;
      name: string | null;
      elo: number;
      rank: string | null;
    };
  }[];
};

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.matchId as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [finishModal, setFinishModal] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishWinner, setFinishWinner] = useState<"red" | "blue">("red");
  const [finishDuration, setFinishDuration] = useState("");
  const [finishMvp, setFinishMvp] = useState("");

  const fetchMatch = () => {
    if (!matchId) return;
    fetch(`/api/matches/${matchId}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setMatch)
      .catch(() => setMatch(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
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

  async function submitFinish() {
    setFinishing(true);
    try {
      const body: { winnerTeam: string; matchDurationMinutes?: number; mvpUserId?: string } = {
        winnerTeam: finishWinner,
      };
      const mins = parseInt(finishDuration, 10);
      if (!Number.isNaN(mins) && mins >= 0) body.matchDurationMinutes = mins;
      if (finishMvp.trim()) body.mvpUserId = finishMvp.trim();
      const res = await fetch(`/api/matches/${matchId}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFinishModal(false);
        setFinishWinner("red");
        setFinishDuration("");
        setFinishMvp("");
        fetchMatch();
      } else {
        alert(data.message || "Erro ao encerrar partida.");
      }
    } finally {
      setFinishing(false);
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
  const isAdmin = match.isAdmin === true;
  const canFinish = isAdmin && (match.status === "pending" || match.status === "in_progress");
  const isFinished = match.status === "finished";
  const red = match.participants.filter((p) => p.team === "red");
  const blue = match.participants.filter((p) => p.team === "blue");
  const mvpUserId = match.settings?.mvpUserId ?? null;
  const durationMin = match.matchDuration != null ? Math.round(match.matchDuration / 60) : null;

  return (
    <div className="space-y-6">
      <Link href="/matches" className="text-sm text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)]">
        ← Voltar às partidas
      </Link>

      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6 clip-card" style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-[var(--hub-text)]">
              Partida {match.type} · {match.status === "finished" ? "Encerrada" : match.status === "in_progress" ? "Iniciada" : match.status}
            </h1>
            <p className="text-sm text-[var(--hub-text-muted)] mt-1">
              {match.playerCount}/{match.maxPlayers} jogadores
              {match.creator && ` · Criador: ${match.creator.username ?? match.creator.name ?? "—"}`}
            </p>
            {(match.status === "pending" || match.status === "in_progress") && match.userInMatch && !isAdmin && (
              <p className="text-xs text-[var(--hub-accent)]/90 mt-1">
                Quando a partida for encerrada no jogo, o resultado e as estatísticas serão atualizados automaticamente no site.
              </p>
            )}
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
            {match.userInMatch && (match.status === "pending" || match.status === "in_progress") && (
              <>
                {canFinish && (
                  <button
                    onClick={() => setFinishModal(true)}
                    className="rounded-lg border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-4 py-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent)] hover:bg-[var(--hub-accent)] hover:text-white clip-button"
                  >
                    Encerrar partida
                  </button>
                )}
                {isCreator && match.status === "pending" && (
                  <button
                    onClick={cancelMatch}
                    disabled={cancelling}
                    className="rounded-lg border border-[var(--hub-accent-red)]/50 px-4 py-2 text-sm font-medium text-[var(--hub-accent-red)] hover:bg-[var(--hub-accent-red)]/10 disabled:opacity-50"
                  >
                    {cancelling ? "Cancelando..." : "Cancelar partida"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {match.status === "in_progress" && (match.map || match.settings?.match_code) && (
          <div className="mt-6 rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/10 p-5">
            <p className="text-sm font-bold uppercase tracking-wider text-[var(--hub-accent)] mb-3">
              Partida iniciada — entre no Valorant
            </p>
            <div className="flex flex-wrap gap-6 text-[var(--hub-text)]">
              {match.map && (
                <div>
                  <span className="text-xs text-[var(--hub-text-muted)] uppercase">Mapa</span>
                  <p className="text-lg font-semibold">{match.map}</p>
                </div>
              )}
              {match.settings?.match_code && (
                <div>
                  <span className="text-xs text-[var(--hub-text-muted)] uppercase">Código da partida (referência)</span>
                  <p className="text-xl font-mono font-bold tracking-wider text-[var(--hub-accent)]">{match.settings.match_code}</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-sm text-[var(--hub-text-muted)]">
              O criador abre uma partida custom no Valorant, escolhe o mapa acima, e informa o código que aparecer no jogo para os jogadores entrarem. Após o fim da partida, o resultado será sincronizado automaticamente.
            </p>
          </div>
        )}

        {isFinished && match.winnerTeam && (
          <div className="mt-6 rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/10 p-4 flex flex-wrap items-center gap-4">
            <Trophy size={28} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-lg font-bold text-[var(--hub-text)]">
                {match.winnerTeam === "red" ? "Time Red venceu!" : "Time Blue venceu!"}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-[var(--hub-text-muted)]">
                {durationMin != null && (
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {durationMin} min
                  </span>
                )}
                {mvpUserId && (() => {
                  const mvp = match.participants.find((p) => p.userId === mvpUserId);
                  return mvp ? (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star size={14} />
                      MVP: {mvp.user.username ?? mvp.user.name ?? "—"}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        )}

        {isFinished && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[var(--hub-border)] text-[var(--hub-text-muted)]">
                  <th className="p-2">Jogador</th>
                  <th className="p-2">Time</th>
                  <th className="p-2">K / D / A</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">ELO</th>
                </tr>
              </thead>
              <tbody>
                {match.participants.map((p) => {
                  const won = p.team === match.winnerTeam;
                  return (
                    <tr key={p.userId} className="border-b border-[var(--hub-border)]/80">
                      <td className="p-2 text-[var(--hub-text)]">
                        {p.user.username ?? p.user.name ?? "—"}
                        {mvpUserId === p.userId && (
                          <span className="ml-1 text-amber-400" title="MVP">
                            <Star size={14} className="inline" />
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className={p.team === "red" ? "text-[var(--hub-accent-red)]" : "text-[var(--hub-accent-cyan)]"}>
                          {p.team === "red" ? "Red" : "Blue"}
                        </span>
                      </td>
                      <td className="p-2 text-[var(--hub-text-muted)]">
                        {p.kills} / {p.deaths} / {p.assists}
                      </td>
                      <td className="p-2 text-[var(--hub-text)]">{p.score}</td>
                      <td className="p-2">
                        <span className={won ? "text-[var(--hub-accent)]" : "text-[var(--hub-text-muted)]"}>
                          {p.user.elo} {won ? "(+1)" : "(-1)"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isFinished && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]/50 p-4">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent-red)]">Time Red</h2>
              <ul className="space-y-1">
                {red.map((p) => (
                  <li key={p.userId} className="text-sm text-[var(--hub-text)]">
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
                  <li key={p.userId} className="text-sm text-[var(--hub-text)]">
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
        )}
      </div>

      {finishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !finishing && setFinishModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[var(--hub-text)]">Encerrar partida</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--hub-text-muted)] mb-1">Time vencedor</label>
                <select
                  value={finishWinner}
                  onChange={(e) => setFinishWinner(e.target.value as "red" | "blue")}
                  className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] px-3 py-2 text-sm text-[var(--hub-text)]"
                >
                  <option value="red">Time Red</option>
                  <option value="blue">Time Blue</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--hub-text-muted)] mb-1">Duração (minutos, opcional)</label>
                <input
                  type="number"
                  min={0}
                  value={finishDuration}
                  onChange={(e) => setFinishDuration(e.target.value)}
                  placeholder="Ex: 25"
                  className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] px-3 py-2 text-sm text-[var(--hub-text)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--hub-text-muted)] mb-1">MVP (opcional)</label>
                <select
                  value={finishMvp}
                  onChange={(e) => setFinishMvp(e.target.value)}
                  className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] px-3 py-2 text-sm text-[var(--hub-text)]"
                >
                  <option value="">— Nenhum —</option>
                  {match.participants.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.user.username ?? p.user.name ?? p.userId} ({p.team})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => !finishing && setFinishModal(false)}
                className="rounded-lg border border-[var(--hub-border)] px-4 py-2 text-sm text-[var(--hub-text)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitFinish}
                disabled={finishing}
                className="rounded-lg bg-[var(--hub-accent)] px-4 py-2 text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
              >
                {finishing && <Loader2 size={16} className="animate-spin" />}
                {finishing ? "Encerrando…" : "Confirmar resultado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
