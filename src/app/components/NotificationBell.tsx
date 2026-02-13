"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Bell, UserPlus, MessageCircle, Trophy, Zap, Heart } from "lucide-react";
import { useToast } from "@/src/app/context/ToastContext";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

const FALLBACK_POLL_MS = 60000;

function iconForType(type: string) {
  const t = type?.toLowerCase() ?? "";
  if (t.includes("amizade") || t.includes("friend")) return <UserPlus size={16} className="shrink-0 text-[var(--hub-accent)]" />;
  if (t.includes("mensagem") || t.includes("message")) return <MessageCircle size={16} className="shrink-0 text-[var(--hub-accent)]" />;
  if (t.includes("partida") || t.includes("match") || t.includes("vitória")) return <Trophy size={16} className="shrink-0 text-amber-400" />;
  if (t === "profile_like" || t.includes("curtiu")) return <Heart size={16} className="shrink-0 text-[var(--hub-accent-red)]" />;
  if (t === "mission_completed" || t.includes("missão")) return <Zap size={16} className="shrink-0 text-amber-400" />;
  return <Zap size={16} className="shrink-0 text-[var(--hub-text-muted)]" />;
}

function formatTime(createdAt: string) {
  const d = new Date(createdAt);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Agora";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const TOAST_TYPES = new Set(["mission_completed", "profile_like"]);

export function NotificationBell() {
  const { data: session, status } = useSession();
  const { addToast } = useToast();
  const [list, setList] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/notifications", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => {
        const next = json.data ?? [];
        setList((prev) => {
          const prevIds = new Set(prev.map((n) => n.id));
          next.forEach((n: Notif) => {
            if (!prevIds.has(n.id) && TOAST_TYPES.has(n.type)) {
              addToast({ title: n.title, body: n.body ?? undefined, type: n.type });
            }
          });
          return next;
        });
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [status, addToast]);

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
            if (TOAST_TYPES.has(data.type)) {
              addToast({ title: data.title ?? "Notificação", body: data.body ?? undefined, type: data.type });
            }
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
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-elevated)] text-[var(--hub-text)] transition-all hover:border-[var(--hub-accent)]/50 hover:bg-[var(--hub-bg-card)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)]/50"
        aria-label={unreadCount > 0 ? `${unreadCount} notificações não lidas` : "Notificações"}
      >
        <Bell size={22} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--hub-accent)] px-1.5 text-[11px] font-bold text-white shadow-sm ring-2 ring-[var(--hub-bg-card)]">
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
            className="absolute left-full top-0 z-50 ml-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] shadow-2xl"
            role="dialog"
            aria-label="Notificações"
          >
            <div className="flex items-center justify-between bg-[var(--hub-bg-elevated)]/80 px-4 py-3.5 border-b border-[var(--hub-border)]">
              <span className="text-sm font-bold uppercase tracking-wider text-[var(--hub-text)]">
                Notificações
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-[var(--hub-accent)] transition-colors hover:text-[var(--hub-accent)]/80"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-[min(70vh,400px)] overflow-y-auto">
              {loading && list.length === 0 ? (
                <div className="flex justify-center py-10">
                  <div className="hub-loading-spinner" />
                </div>
              ) : list.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell size={32} className="mx-auto mb-2 text-[var(--hub-text-muted)]/50" />
                  <p className="text-sm text-[var(--hub-text-muted)]">
                    Nenhuma notificação.
                  </p>
                </div>
              ) : (
                <ul className="py-1">
                  {list.slice(0, 30).map((n) => (
                    <li
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 transition-colors ${!n.readAt ? "bg-[var(--hub-accent)]/10" : "hover:bg-[var(--hub-bg-elevated)]/50"}`}
                    >
                      <span className="mt-0.5">{iconForType(n.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug text-[var(--hub-text)]">{n.title}</p>
                        {n.body && (
                          <p className="mt-0.5 text-xs leading-snug text-[var(--hub-text-muted)] line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1.5 text-[11px] text-[var(--hub-text-muted)]">
                          {formatTime(n.createdAt)}
                        </p>
                      </div>
                      {!n.readAt && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--hub-accent)]" aria-hidden />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]/50 p-2">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-[var(--hub-accent)] transition-colors hover:bg-[var(--hub-accent)]/10"
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
