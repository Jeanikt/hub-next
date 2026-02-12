"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

const FALLBACK_POLL_MS = 60000;

export function NotificationBell() {
  const { data: session, status } = useSession();
  const [list, setList] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/notifications", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setList(json.data ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchList();
  }, [status, fetchList]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/notifications/stream");
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string);
          if (Array.isArray(data)) {
            setList((prev) => {
              const byId = new Map(prev.map((n) => [n.id, n]));
              for (const n of data) byId.set(n.id, n);
              return Array.from(byId.values()).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            });
          } else if (data?.id) {
            setList((prev) => [data, ...prev.filter((n) => n.id !== data.id)]);
          }
        } catch {
          // ping ou formato inesperado
        }
      };
      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
      };
    } catch {
      // EventSource não disponível
    }
    const fallback = setInterval(fetchList, FALLBACK_POLL_MS);
    return () => {
      eventSource?.close();
      clearInterval(fallback);
    };
  }, [status, fetchList]);

  const unreadCount = list.filter((n) => !n.readAt).length;

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST", credentials: "include" });
    setList((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setOpen(false);
  }

  if (status !== "authenticated" || !session?.user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-elevated)] text-[var(--hub-text)] hover:bg-[var(--hub-bg-card)] transition-colors"
        aria-label={unreadCount > 0 ? `${unreadCount} notificações não lidas` : "Notificações"}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--hub-accent)] px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] shadow-xl"
            role="dialog"
            aria-label="Notificações"
          >
            <div className="flex items-center justify-between border-b border-[var(--hub-border)] px-4 py-3">
              <span className="text-sm font-bold uppercase tracking-wider text-[var(--hub-text)]">
                Notificações
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-[var(--hub-accent)] hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {loading && list.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="hub-loading-spinner" />
                </div>
              ) : list.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--hub-text-muted)]">
                  Nenhuma notificação.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--hub-border)]">
                  {list.slice(0, 30).map((n) => (
                    <li
                      key={n.id}
                      className={`px-4 py-3 ${!n.readAt ? "bg-[var(--hub-accent)]/5" : ""}`}
                    >
                      <p className="text-sm font-medium text-[var(--hub-text)]">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-[var(--hub-text-muted)] line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-[var(--hub-text-muted)]">
                        {new Date(n.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-[var(--hub-border)] p-2">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block rounded-lg py-2 text-center text-sm font-medium text-[var(--hub-accent)] hover:bg-[var(--hub-accent)]/10"
              >
                Ver todas
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
