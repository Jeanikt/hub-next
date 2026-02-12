"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Target, Trophy, Zap, CheckCircle2, Star, ChevronRight } from "lucide-react";

type Mission = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  xpReward: number;
  completed: boolean;
};

export default function MissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    fetch("/api/missions", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMissions(d.data ?? []))
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }, [status, router]);

  async function completeMission(missionId: string) {
    setCompleting(missionId);
    try {
      const res = await fetch(`/api/missions/${missionId}/complete`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setMissions((prev) =>
          prev.map((m) => (m.id === missionId ? { ...m, completed: true } : m))
        );
      }
    } finally {
      setCompleting(null);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] clip-card">
        <div className="text-center">
          <div className="hub-loading-spinner mx-auto mb-4" />
          <p className="text-sm font-medium text-[var(--hub-text-muted)]">Carregando missões...</p>
        </div>
      </div>
    );
  }

  const typeLabel: Record<string, string> = {
    daily: "Diária",
    weekly: "Semanal",
    one_time: "Única",
  };
  const typeIcon: Record<string, React.ReactNode> = {
    daily: <Zap size={20} className="text-[var(--hub-accent)]" />,
    weekly: <Trophy size={20} className="text-amber-400" />,
    one_time: <Target size={20} className="text-[var(--hub-accent-cyan)]" />,
  };
  const completedCount = missions.filter((m) => m.completed).length;

  return (
    <div className="space-y-8">
      <header className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--hub-accent)]">
          Recompensas
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] md:text-3xl flex items-center gap-2">
          Missões
          <ChevronRight className="text-[var(--hub-accent)] hidden sm:block" size={28} />
        </h1>
        <p className="mt-1 text-sm text-[var(--hub-text-muted)]">
          Complete missões, ganhe XP e suba de nível.
        </p>
        {missions.length > 0 && (
          <p className="mt-2 text-xs text-[var(--hub-text-muted)]">
            <strong className="text-[var(--hub-text)]">{completedCount}</strong> de {missions.length} concluídas
          </p>
        )}
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {missions.map((m) => (
          <article
            key={m.id}
            className={`rounded-2xl border bg-[var(--hub-bg-card)] p-6 clip-card transition-all duration-300 hover:shadow-lg hover:shadow-black/15 ${
              m.completed
                ? "border-[var(--hub-accent)]/30 bg-[var(--hub-accent)]/5"
                : "border-[var(--hub-border)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-[var(--hub-bg)]/80 px-2.5 py-1.5">
                {typeIcon[m.type] ?? <Target size={18} />}
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
                  {typeLabel[m.type] ?? m.type}
                </span>
              </div>
              {m.completed ? (
                <span className="flex items-center gap-1.5 rounded-lg bg-[var(--hub-accent)]/20 px-2.5 py-1 text-sm font-medium text-[var(--hub-accent)]">
                  <CheckCircle2 size={18} />
                  Concluída
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-lg bg-[var(--hub-accent)]/20 px-2.5 py-1 text-sm font-bold text-[var(--hub-accent)]">
                  <Star size={16} />
                  +{m.xpReward} XP
                </span>
              )}
            </div>
            <h2 className="mt-4 text-lg font-bold text-[var(--hub-text)]">{m.title}</h2>
            {m.description && (
              <p className="mt-2 text-sm text-[var(--hub-text-muted)] leading-relaxed">{m.description}</p>
            )}
            {!m.completed && session?.user && (
              <button
                type="button"
                onClick={() => completeMission(m.id)}
                disabled={!!completing}
                className="mt-5 w-full rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-[var(--hub-accent)] disabled:opacity-50 clip-button"
              >
                {completing === m.id ? "Salvando..." : "Marcar como concluída"}
              </button>
            )}
          </article>
        ))}
      </div>

      {missions.length === 0 && (
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-10 text-center clip-card">
          <Target className="mx-auto text-[var(--hub-text-muted)]/50" size={48} />
          <p className="mt-4 font-medium text-[var(--hub-text)]">Nenhuma missão disponível</p>
          <p className="mt-2 text-sm text-[var(--hub-text-muted)]">
            Rode o seed no projeto para popular as missões: <code className="rounded bg-[var(--hub-bg)] px-1.5 py-0.5 text-[var(--hub-accent)]">npm run db:seed</code>
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-sm text-[var(--hub-accent)] hover:underline"
          >
            ← Voltar ao Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
