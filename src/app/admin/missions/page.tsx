"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Target, Loader2 } from "lucide-react";

type Mission = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  xpReward: number;
  isActive: boolean;
  createdAt: string;
  completionsCount: number;
};

export default function AdminMissionsPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  function fetchMissions() {
    fetch("/api/admin/missions", { credentials: "include" })
      .then((r) => {
        if (r.status === 403) router.push("/dashboard");
        return r.json();
      })
      .then((d) => setMissions(d.data ?? []))
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchMissions();
  }, []);

  async function toggleActive(m: Mission) {
    setToggling(m.id);
    try {
      const res = await fetch(`/api/admin/missions/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !m.isActive }),
      });
      if (res.ok) {
        setMissions((prev) =>
          prev.map((x) => (x.id === m.id ? { ...x, isActive: !x.isActive } : x))
        );
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message ?? "Erro ao atualizar.");
      }
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--hub-text-muted)]">
        <div className="hub-loading-spinner h-6 w-6 border-2" />
        Carregando missões...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--hub-accent)]">Admin</p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] flex items-center gap-2">
          <Target size={28} />
          Missões
        </h1>
        <p className="mt-1 text-sm text-[var(--hub-text-muted)]">
          Ative ou desative missões. Inativas não aparecem para os usuários.
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--hub-border)] text-[var(--hub-text-muted)]">
              <th className="p-3">Título</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">XP</th>
              <th className="p-3">Conclusões</th>
              <th className="p-3">Ativa</th>
              <th className="p-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {missions.map((m) => (
              <tr key={m.id} className="border-b border-[var(--hub-border)]/80">
                <td className="p-3">
                  <p className="font-medium text-[var(--hub-text)]">{m.title}</p>
                  {m.description && (
                    <p className="text-xs text-[var(--hub-text-muted)] line-clamp-1">{m.description}</p>
                  )}
                </td>
                <td className="p-3 text-[var(--hub-text-muted)]">{m.type}</td>
                <td className="p-3 text-[var(--hub-text)]">{m.xpReward}</td>
                <td className="p-3 text-[var(--hub-text-muted)]">{m.completionsCount}</td>
                <td className="p-3">
                  <span
                    className={
                      m.isActive
                        ? "text-[var(--hub-accent)] font-medium"
                        : "text-[var(--hub-text-muted)]"
                    }
                  >
                    {m.isActive ? "Sim" : "Não"}
                  </span>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    disabled={toggling === m.id}
                    onClick={() => toggleActive(m)}
                    className="rounded-lg border border-[var(--hub-border)] px-3 py-1.5 text-xs font-medium text-[var(--hub-text)] hover:bg-[var(--hub-bg-elevated)] disabled:opacity-50 flex items-center gap-1"
                  >
                    {toggling === m.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {m.isActive ? "Desativar" : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {missions.length === 0 && (
          <p className="p-6 text-center text-[var(--hub-text-muted)]">Nenhuma missão cadastrada.</p>
        )}
      </div>
    </div>
  );
}
