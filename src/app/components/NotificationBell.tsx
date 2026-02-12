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

const CHANNEL_PREFIX = "private-notifications-";
const EVENT_NOTIFICATION = "new-notification";
const POLL_MS = 60000;

export function NotificationBell() {
  const { data: session, status } = useSession();
  const [list, setList] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pusherRef = useRef<{ unsubscribe: (ch: string) => void } | null>(null);

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
    const t = setInterval(fetchList, POLL_MS);
    return () => clearInterval(t);
  }, [status, fetchList]);

  useEffect(() => {
    const userId = (session?.user as { id?: string })?.id;
    if (!userId || status !== "authenticated") return;

    let client: { unsubscribe: (ch: string) => void } | null = null;

    fetch("/api/pusher/config", { credentials: "include" })
      .then((r) => r.json())
      .then((config) => {
        if (!config?.enabled || !config?.key) return;
        return import("pusher-js").then(({ default: Pusher }) => {
          const pusher = new Pusher(config.key, {
            cluster: config.cluster,
            authEndpoint: "/api/pusher/auth",
            auth: { params: {} },
          });
          pusherRef.current = pusher;
          const channelName = `${CHANNEL_PREFIX}${userId}`;
          const channel = pusher.subscribe(channelName);
          channel.bind(EVENT_NOTIFICATION, (payload: Partial<Notif>) => {
            const id = payload?.id;
            if (id) {
              setList((prev) => [
                {
                  id,
                  type: payload.type ?? "generic",
                  title: payload.title ?? "",
                  body: payload.body ?? null,
                  readAt: payload.readAt ?? null,
                  createdAt: payload.createdAt ?? new Date().toISOString(),
                },
                ...prev.filter((n) => n.id !== id),
              ]);
            }
          });
          client = pusher;
        });
      });

    return () => {
      if (client) {
        const ch = `${CHANNEL_PREFIX}${userId}`;
        (client as { unsubscribe: (c: string) => void }).unsubscribe(ch);
      }
      pusherRef.current = null;
    };
  }, [session?.user, status]);

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
