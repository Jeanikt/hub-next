"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";

type ReportItem = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null; email: string | null };
};

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">
          Reports
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1">
          Denúncias para análise
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[20vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)]">
          <div className="hub-loading-spinner" />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-8 text-center">
          <Flag size={48} className="mx-auto text-[var(--hub-text-muted)]/50" />
          <p className="mt-4 text-[var(--hub-text-muted)]">Nenhum report no momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
                    {r.targetType} · {r.targetId}
                  </p>
                  <p className="mt-1 text-[var(--hub-text)]">{r.reason}</p>
                  <p className="mt-2 text-sm text-[var(--hub-text-muted)]">
                    Por {r.user.username ?? r.user.name ?? r.user.email ?? r.user.id} · {new Date(r.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                    r.status === "pending"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-[var(--hub-accent)]/20 text-[var(--hub-accent)]"
                  }`}
                >
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm">
        <Link href="/admin" className="text-[var(--hub-accent)] hover:underline">
          ← Voltar ao Admin
        </Link>
      </p>
    </div>
  );
}
