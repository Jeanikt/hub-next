"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Target, Trophy, Zap, CheckCircle2 } from "lucide-react";

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
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)]">
        <div className="hub-loading-spinner" />
      </div>
    );
  }

  const typeLabel: Record<string, string> = {
    daily: "Diária",
    weekly: "Semanal",
    one_time: "Única",
  };
  const typeIcon: Record<string, React.ReactNode> = {
    daily: <Zap size={18} className="text-[var(--hub-accent)]" />,
    weekly: <Trophy size={18} className="text-amber-400" />,
    one_time: <Target size={18} className="text-[var(--hub-accent-cyan)]" />,
  };

  return (
    <div className="space-y-8">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--hub-accent)]">
          Recompensas
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">
          Missões
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1">
          Complete missões, ganhe XP e suba de nível.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {missions.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {typeIcon[m.type] ?? <Target size={18} />}
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
                  {typeLabel[m.type] ?? m.type}
                </span>
              </div>
              {m.completed ? (
                <span className="flex items-center gap-1 text-sm text-[var(--hub-accent)]">
                  <CheckCircle2 size={18} />
                  Concluída
                </span>
              ) : (
                <span className="text-sm font-bold text-[var(--hub-accent)]">
                  +{m.xpReward} XP
                </span>
              )}
            </div>
            <h2 className="mt-3 font-bold text-[var(--hub-text)]">{m.title}</h2>
            {m.description && (
              <p className="mt-1 text-sm text-[var(--hub-text-muted)]">{m.description}</p>
            )}
            {!m.completed && session?.user && (
              <button
                type="button"
                onClick={() => completeMission(m.id)}
                disabled={!!completing}
                className="mt-4 rounded-lg bg-[var(--hub-accent)] px-4 py-2 text-sm font-bold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-50"
              >
                {completing === m.id ? "..." : "Marcar como concluída"}
              </button>
            )}
          </div>
        ))}
      </div>

      {missions.length === 0 && (
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-8 text-center text-[var(--hub-text-muted)]">
          Nenhuma missão disponível no momento. Rode o seed: <code className="text-[var(--hub-text)]">npx prisma db seed</code>
        </div>
      )}
    </div>
  );
}
