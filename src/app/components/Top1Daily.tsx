"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Trophy, X } from "lucide-react";

const STORAGE_KEY = "hub_top1_last_shown_at";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type LeaderEntry = {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  elo: number;
  level: number;
  rank: string | null;
};

export function Top1Daily() {
  const { status } = useSession();
  const [show, setShow] = useState(false);
  const [top, setTop] = useState<LeaderEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {}
    }
    setShow(false);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const last = raw ? parseInt(raw, 10) : 0;
      if (Date.now() - last < MS_PER_DAY) return;

      setLoading(true);
      fetch("/api/leaderboard?limit=1", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((json) => {
          const list = json.data ?? [];
          if (list.length > 0) {
            setTop(list[0]);
            setShow(true);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch {
      setLoading(false);
    }
  }, [status]);

  if (!show || !top) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/50"
        aria-hidden
        onClick={dismiss}
      />
      <div
        className="fixed left-1/2 top-1/2 z-[91] w-[min(360px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] shadow-2xl overflow-hidden"
        role="dialog"
        aria-label="Top 1 do ranking hoje"
      >
        <div className="bg-gradient-to-b from-amber-500/20 to-transparent px-4 pt-4 pb-3 border-b border-[var(--hub-border)]">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-text)]">
              <Trophy size={20} className="text-amber-400" />
              Top 1 do dia
            </span>
            <button
              type="button"
              onClick={dismiss}
              className="p-1.5 rounded-lg text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)] transition-colors"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-4 flex items-center gap-4">
          <div className="relative h-14 w-14 rounded-full overflow-hidden bg-[var(--hub-bg-elevated)] shrink-0">
            {top.avatarUrl ? (
              <img
                src={top.avatarUrl}
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[var(--hub-text-muted)]">
                {(top.username ?? top.name ?? "?")[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[var(--hub-text)] truncate">
              {top.username ?? top.name ?? "Jogador"}
            </p>
            <p className="text-sm text-[var(--hub-text-muted)]">
              {top.rank ?? "Unranked"} · Nível {top.level}
            </p>
            <p className="text-xs text-[var(--hub-accent)] font-semibold mt-0.5">
              {top.elo} ELO
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
