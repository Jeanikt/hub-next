"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [list, setList] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setList(json.data ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setList((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  }

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            Notificações
          </h1>
          <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
            Suas notificações
          </p>
        </div>
        {list.some((n) => !n.readAt) && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-sm text-[var(--hub-accent)] hover:underline uppercase tracking-wider"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] rounded-2xl overflow-hidden clip-card">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="hub-loading-spinner" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-[var(--hub-text-muted)]">Nenhuma notificação.</p>
        ) : (
          <ul className="divide-y divide-[var(--hub-border)]">
            {list.map((n) => (
              <li
                key={n.id}
                className={`px-4 py-4 ${!n.readAt ? "bg-[var(--hub-accent)]/5" : ""}`}
              >
                <p className="font-semibold text-white">{n.title}</p>
                <p className="text-sm text-[var(--hub-text-muted)] mt-1">{n.body}</p>
                <p className="text-xs text-[var(--hub-text-muted)] mt-2">{n.createdAt}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
