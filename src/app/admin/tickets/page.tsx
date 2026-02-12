"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

export default function AdminTicketsPage() {
  const [data, setData] = useState<{ id: string; subject?: string; status?: string }[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/tickets", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-[var(--hub-text-muted)]">Carregando tickets...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">
        Tickets de suporte
      </h1>
      {!data || data.length === 0 ? (
        <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-8 text-center">
          <MessageSquare size={48} className="mx-auto text-[var(--hub-text-muted)] mb-3" />
          <p className="text-[var(--hub-text-muted)]">Nenhum ticket no momento.</p>
          <p className="text-sm text-[var(--hub-text-muted)] mt-1">
            Quando houver um modelo de tickets no banco, eles aparecerão aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-4"
            >
              <p className="font-medium text-[var(--hub-text)]">{t.subject ?? t.id}</p>
              <p className="text-sm text-[var(--hub-text-muted)]">{t.status ?? "—"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
