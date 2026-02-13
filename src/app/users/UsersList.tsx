"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserPlus, Flag, BadgeCheck } from "lucide-react";
import { ReportModal } from "@/src/app/components/ReportModal";

type User = {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  elo: number;
  level: number;
  profileBadge?: string | null;
  isVerified?: boolean;
};

export function UsersList() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addState, setAddState] = useState<Record<string, "idle" | "loading" | "sent" | "error">>({});
  const [reportTarget, setReportTarget] = useState<User | null>(null);
  const perPage = 20;
  const myId = (session?.user as { id?: string })?.id;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search.trim()) params.set("search", search.trim());
    queueMicrotask(() => setLoading(true));
    fetch(`/api/users?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setData(json.data ?? []);
          setTotal(json.total ?? 0);
        }
      })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, search]);

  const totalPages = Math.ceil(total / perPage) || 1;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nome ou username..."
          className="flex-1 px-4 py-3 bg-[var(--hub-bg-card)] border border-[var(--hub-border)] text-white placeholder-[var(--hub-text-muted)] focus:border-[var(--hub-accent)] focus:outline-none clip-button"
        />
      </div>

      <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] rounded-2xl overflow-hidden clip-card">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="hub-loading-spinner" />
          </div>
        ) : data.length === 0 ? (
          <p className="py-12 text-center text-[var(--hub-text-muted)]">Nenhum jogador encontrado.</p>
        ) : (
          <ul className="divide-y divide-[var(--hub-border)]">
            {data.map((u) => {
              const isSelf = myId === u.id;
              const addStatus = addState[u.id] ?? "idle";
              const showActions = status === "authenticated" && session?.user && !isSelf;
              return (
                <li key={u.id} className="hover:bg-white/5 transition">
                  <div className="flex items-center gap-4 px-4 py-4">
                    <Link
                      href={u.username ? `/users/${encodeURIComponent(u.username)}` : "#"}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <span className="w-12 h-12 rounded-full bg-[var(--hub-accent)]/20 flex items-center justify-center text-lg font-bold text-[var(--hub-accent)] shrink-0">
                          {(u.username ?? u.name ?? "?")[0]?.toUpperCase()}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate flex items-center gap-1.5">
                          {u.username ?? u.name ?? "—"}
                          {u.isVerified && <span title="Verificado"><BadgeCheck size={14} className="shrink-0 text-[var(--hub-accent)]" /></span>}
                          {u.profileBadge && (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--hub-text-muted)] shrink-0">
                              {u.profileBadge === "dev" ? "Dev" : u.profileBadge === "admin" ? "Admin" : u.profileBadge === "mod" ? "Mod" : u.profileBadge === "streamer" ? "Streamer" : u.profileBadge === "coach" ? "Coach": u.profileBadge === "pro" ? "Pro Player" : u.profileBadge}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-[var(--hub-text-muted)]">ELO {u.elo} · Nível {u.level}</p>
                      </div>
                      <span className="text-[var(--hub-accent)] font-mono text-sm shrink-0">→</span>
                    </Link>
                    {showActions && (
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
                        <button
                          type="button"
                          disabled={!u.username || addStatus === "loading" || addStatus === "sent"}
                          onClick={async (e) => {
                            e.preventDefault();
                            if (!u.username) return;
                            setAddState((s) => ({ ...s, [u.id]: "loading" }));
                            try {
                              const res = await fetch("/api/friends", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({ username: u.username }),
                              });
                              const json = await res.json().catch(() => ({}));
                              if (res.ok) {
                                setAddState((s) => ({ ...s, [u.id]: "sent" }));
                              } else {
                                setAddState((s) => ({ ...s, [u.id]: "error" }));
                              }
                            } catch {
                              setAddState((s) => ({ ...s, [u.id]: "error" }));
                            }
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--hub-text-muted)] hover:border-[var(--hub-accent)]/50 hover:text-[var(--hub-accent)] disabled:opacity-50 transition-colors"
                          title="Enviar solicitação de amizade"
                        >
                          <UserPlus size={14} />
                          {addStatus === "loading" ? "…" : addStatus === "sent" ? "Enviado" : "Adicionar"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setReportTarget(u);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--hub-text-muted)] hover:border-red-500/50 hover:text-red-400 transition-colors"
                          title="Reportar jogador"
                        >
                          <Flag size={14} />
                          Reportar
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--hub-border)]">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-sm text-[var(--hub-accent)] hover:underline disabled:opacity-50 disabled:no-underline"
            >
              Anterior
            </button>
            <span className="text-sm text-[var(--hub-text-muted)]">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-sm text-[var(--hub-accent)] hover:underline disabled:opacity-50 disabled:no-underline"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
      {reportTarget && (
        <ReportModal
          isOpen={!!reportTarget}
          onClose={() => setReportTarget(null)}
          targetType="user"
          targetId={reportTarget.id}
          targetLabel={reportTarget.username ?? reportTarget.name ?? "Jogador"}
          onSuccess={() => setReportTarget(null)}
        />
      )}
    </>
  );
}
