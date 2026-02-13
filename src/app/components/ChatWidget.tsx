"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { MessageCircle, X, User, ChevronRight } from "lucide-react";

type Friend = {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  elo: number;
  isOnline: boolean;
};

const UNREAD_POLL_MS = 30000;

export function ChatWidget() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(() => {
    if (status !== "authenticated") return;
    fetch("/api/friend-messages/unread-count", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => setUnreadCount(0));
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchUnread();
    const interval = setInterval(fetchUnread, UNREAD_POLL_MS);
    return () => clearInterval(interval);
  }, [status, fetchUnread]);

  useEffect(() => {
    if (open && status === "authenticated") {
      setLoading(true);
      fetch("/api/friends", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { friends: [] }))
        .then((data) => setFriends(data.friends ?? []))
        .catch(() => setFriends([]))
        .finally(() => {
          setLoading(false);
          fetchUnread();
        });
    }
  }, [open, status, fetchUnread]);

  if (status !== "authenticated" || !session?.user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div
          className="hub-animate-fade-in rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] shadow-xl overflow-hidden"
          style={{ minWidth: "260px", maxWidth: "320px", maxHeight: "70vh" }}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--hub-border)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
              Amigos e chat
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto max-h-[50vh] p-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="hub-loading-spinner" />
              </div>
            ) : friends.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--hub-text-muted)]">
                Nenhum amigo ainda. Adicione alguém em Jogadores ou no perfil.
              </p>
            ) : (
              <ul className="space-y-1">
                {friends.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={f.username ? `/messages/${encodeURIComponent(f.username)}` : "/friends"}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--hub-bg-elevated)]"
                    >
                      {f.avatarUrl ? (
                        <img
                          src={f.avatarUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--hub-accent)]/20 text-sm font-bold text-[var(--hub-accent)]">
                          {(f.username ?? f.name ?? "?")[0]?.toUpperCase()}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--hub-text)] truncate">
                          {f.username ?? f.name ?? "—"}
                        </p>
                        <p className="text-xs text-[var(--hub-text-muted)]">
                          {f.isOnline ? (
                            <span className="text-[var(--hub-accent)]">Online</span>
                          ) : (
                            "Offline"
                          )}
                        </p>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-[var(--hub-text-muted)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-2 border-t border-[var(--hub-border)]">
            <Link
              href="/friends"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]/50 px-3 py-2.5 text-sm font-medium text-[var(--hub-text)] hover:border-[var(--hub-accent)]/50 hover:text-[var(--hub-accent)] transition-colors"
            >
              <User size={18} />
              Ver todos os amigos e pedidos
            </Link>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--hub-accent)]/40 bg-[var(--hub-bg-card)] text-[var(--hub-accent)] shadow-lg transition-all hover:scale-105 hover:border-[var(--hub-accent)] hover:shadow-[var(--hub-accent)]/20"
        aria-label={open ? "Fechar chat" : unreadCount > 0 ? `${unreadCount} mensagens não lidas` : "Abrir chat"}
      >
        <MessageCircle size={26} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--hub-accent)] px-1.5 text-xs font-bold text-white shadow-md ring-2 ring-[var(--hub-bg-card)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
