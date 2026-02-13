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
  const available = missions.filter((m) => !m.completed);
  const completed = missions.filter((m) => m.completed);

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
            <strong className="text-[var(--hub-text)]">{completed.length}</strong> concluídas · <strong className="text-[var(--hub-text)]">{available.length}</strong> disponíveis
          </p>
        )}
      </header>

      {available.length > 0 && (
        <>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
            Missões disponíveis
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
        {available.map((m) => (
          <article
            key={m.id}
            className={`relative overflow-hidden rounded-2xl border-2 p-6 clip-card transition-all duration-300 hover:shadow-lg ${
              m.completed
                ? "border-[var(--hub-accent)] bg-[var(--hub-accent)]/10 shadow-[inset_0_0_0_1px_var(--hub-accent)]/20"
                : "border-[var(--hub-border)] bg-[var(--hub-bg-card)] hover:shadow-black/15"
            }`}
          >
            {m.completed && (
              <div className="absolute right-0 top-0 h-24 w-24 opacity-10" aria-hidden>
                <CheckCircle2 className="text-[var(--hub-accent)]" size={96} strokeWidth={1.5} />
              </div>
            )}
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-[var(--hub-bg)]/80 px-2.5 py-1.5">
                {typeIcon[m.type] ?? <Target size={18} />}
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
                  {typeLabel[m.type] ?? m.type}
                </span>
              </div>
              {m.completed ? (
                <span className="flex items-center gap-1.5 rounded-xl bg-[var(--hub-accent)]/25 px-3 py-1.5 text-sm font-bold text-[var(--hub-accent)] ring-1 ring-[var(--hub-accent)]/30">
                  <CheckCircle2 size={20} strokeWidth={2.5} />
                  Concluída
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-lg bg-[var(--hub-accent)]/20 px-2.5 py-1 text-sm font-bold text-[var(--hub-accent)]">
                  <Star size={16} />
                  +{m.xpReward} XP
                </span>
              )}
            </div>
            <h2 className="relative mt-4 text-lg font-bold text-[var(--hub-text)]">{m.title}</h2>
            {m.description && (
              <p className="relative mt-2 text-sm text-[var(--hub-text-muted)] leading-relaxed">{m.description}</p>
            )}
            {m.completed ? (
              <p className="relative mt-4 flex items-center gap-2 text-sm font-medium text-[var(--hub-accent)]">
                <CheckCircle2 size={18} />
                Você ganhou <strong>+{m.xpReward} XP</strong> por esta missão.
              </p>
            ) : (
              <p className="relative mt-5 text-xs text-[var(--hub-text-muted)]">
                Concluída automaticamente quando você atingir o objetivo.
              </p>
            )}
          </article>
        ))}
          </div>
        </>
      )}

      {completed.length > 0 && (
        <>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--hub-text-muted)] pt-4 border-t border-[var(--hub-border)]">
            Concluídas
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {completed.map((m) => (
              <article
                key={m.id}
                className="relative overflow-hidden rounded-2xl border-2 border-[var(--hub-accent)]/30 bg-[var(--hub-accent)]/10 p-6 clip-card"
              >
                <div className="absolute right-0 top-0 h-24 w-24 opacity-10" aria-hidden>
                  <CheckCircle2 className="text-[var(--hub-accent)]" size={96} strokeWidth={1.5} />
                </div>
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-[var(--hub-bg)]/80 px-2.5 py-1.5">
                    {typeIcon[m.type] ?? <Target size={18} />}
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
                      {typeLabel[m.type] ?? m.type}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-xl bg-[var(--hub-accent)]/25 px-3 py-1.5 text-sm font-bold text-[var(--hub-accent)]">
                    <CheckCircle2 size={20} strokeWidth={2.5} />
                    Concluída
                  </span>
                </div>
                <h2 className="relative mt-4 text-lg font-bold text-[var(--hub-text)]">{m.title}</h2>
                {m.description && (
                  <p className="relative mt-2 text-sm text-[var(--hub-text-muted)] leading-relaxed">{m.description}</p>
                )}
                <p className="relative mt-4 flex items-center gap-2 text-sm font-medium text-[var(--hub-accent)]">
                  <CheckCircle2 size={18} />
                  Você ganhou <strong>+{m.xpReward} XP</strong>.
                </p>
              </article>
            ))}
          </div>
        </>
      )}

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
