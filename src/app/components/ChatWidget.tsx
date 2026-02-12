"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export function ChatWidget() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status !== "authenticated" || !session?.user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div
          className="hub-animate-fade-in rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-4 shadow-xl"
          style={{ minWidth: "200px" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
              Chat
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
          <Link
            href="/friends"
            onClick={() => setOpen(false)}
            className="block rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]/50 px-3 py-2.5 text-sm font-medium text-[var(--hub-text)] hover:border-[var(--hub-accent)]/50 hover:text-[var(--hub-accent)] transition-colors"
          >
            Amigos e mensagens
          </Link>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--hub-accent)]/40 bg-[var(--hub-bg-card)] text-[var(--hub-accent)] shadow-lg transition-all hover:scale-105 hover:border-[var(--hub-accent)] hover:shadow-[var(--hub-accent)]/20"
        aria-label={open ? "Fechar chat" : "Abrir chat"}
      >
        <MessageCircle size={26} />
      </button>
    </div>
  );
}
