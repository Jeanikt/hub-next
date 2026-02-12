"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  elo: number;
  level: number;
};

export function UsersList() {
  const [data, setData] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const perPage = 20;

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
            {data.map((u) => (
              <li key={u.id} className="hover:bg-white/5 transition">
                <Link
                  href={u.username ? `/users/${encodeURIComponent(u.username)}` : "#"}
                  className="flex items-center gap-4 px-4 py-4"
                >
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span className="w-12 h-12 rounded-full bg-[var(--hub-accent)]/20 flex items-center justify-center text-lg font-bold text-[var(--hub-accent)]">
                      {(u.username ?? u.name ?? "?")[0]?.toUpperCase()}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{u.username ?? u.name ?? "—"}</p>
                    <p className="text-sm text-[var(--hub-text-muted)]">ELO {u.elo} · Nível {u.level}</p>
                  </div>
                  <span className="text-[var(--hub-accent)] font-mono text-sm">→</span>
                </Link>
              </li>
            ))}
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
    </>
  );
}
