"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SupportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<{ id: string; subject: string; status: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/support/tickets")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setTickets(json.data ?? []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="hub-loading-spinner" />
      </div>
    );
  }
  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Suporte
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
          Tickets e ajuda
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div
          className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-6 rounded-2xl clip-card"
          style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}
        >
          <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Abrir ticket</h2>
          <p className="text-sm text-[var(--hub-text-muted)] mb-4">
            Descreva seu problema ou dúvida e nossa equipe responderá em breve.
          </p>
          <Link
            href="/support/new"
            className="inline-block py-3 px-6 border-2 border-[var(--hub-accent)] text-[var(--hub-accent)] font-bold uppercase tracking-wider text-sm hover:bg-[var(--hub-accent)] hover:text-white transition clip-button"
          >
            Novo ticket
          </Link>
        </div>

        <div
          className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-6 rounded-2xl clip-card"
          style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}
        >
          <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Meus tickets</h2>
          {loading ? (
            <div className="hub-loading-spinner mx-auto my-4" />
          ) : tickets.length === 0 ? (
            <p className="text-sm text-[var(--hub-text-muted)]">Nenhum ticket ainda.</p>
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li key={t.id} className="flex justify-between items-center text-sm">
                  <span className="text-white truncate">{t.subject}</span>
                  <span className="text-[var(--hub-text-muted)]">{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
