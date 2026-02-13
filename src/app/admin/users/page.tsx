"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  elo: number;
  rank: string | null;
  riotId: string | null;
  tagline: string | null;
  isOnline: boolean;
  isBanned: boolean;
  bannedUntil: string | null;
  banReason: string | null;
  createdAt: string;
};

const BAN_DURATIONS = [
  { value: "permanent", label: "Permanente" },
  { value: "10m", label: "10 minutos" },
  { value: "1h", label: "1 hora" },
  { value: "4h", label: "4 horas" },
  { value: "24h", label: "24 horas" },
  { value: "7d", label: "7 dias" },
] as const;

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [banning, setBanning] = useState<string | null>(null);
  const [unbanning, setUnbanning] = useState<string | null>(null);
  const [banModal, setBanModal] = useState<{ user: User } | null>(null);
  const [banReason, setBanReason] = useState("Violação das regras");
  const [banDuration, setBanDuration] = useState<string>("24h");
  const [syncingElo, setSyncingElo] = useState<string | null>(null);

  function fetchUsers() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/admin/users?${params}`, { credentials: "include" })
      .then((r) => {
        if (r.status === 403) router.push("/dashboard");
        return r.json();
      })
      .then((d) => setUsers(d.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchUsers();
  }, [search]);

  async function openBanModal(user: User) {
    setBanModal({ user });
    setBanReason("Violação das regras");
    setBanDuration("24h");
  }

  async function submitBan() {
    if (!banModal) return;
    const { user } = banModal;
    setBanning(user.id);
    try {
      const body: { reason: string; permanent?: boolean; duration?: string } = {
        reason: banReason || "Violação das regras",
      };
      if (banDuration === "permanent") {
        body.permanent = true;
      } else {
        body.duration = banDuration;
      }
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBanModal(null);
        fetchUsers();
      } else {
        alert(data.message || "Erro ao banir.");
      }
    } finally {
      setBanning(null);
    }
  }

  async function unban(id: string) {
    setUnbanning(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/unban`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) fetchUsers();
      else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Erro ao desbanir.");
      }
    } finally {
      setUnbanning(null);
    }
  }

  async function syncUserElo(user: User) {
    if (!user.riotId || !user.tagline) return;
    setSyncingElo(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/sync-elo`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, elo: data.elo ?? u.elo, rank: data.rank ?? u.rank } : u))
        );
      } else {
        alert(data.message ?? "Erro ao sincronizar ELO.");
      }
    } finally {
      setSyncingElo(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--hub-accent)]">Admin</p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">Usuários</h1>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, username ou email"
        className="w-full max-w-md rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-3 py-2 text-sm text-[var(--hub-text)] placeholder:text-[var(--hub-text-muted)] clip-button"
      />
      {loading ? (
        <p className="text-[var(--hub-text-muted)]">Carregando...</p>
      ) : (
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] overflow-hidden clip-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--hub-border)] text-[var(--hub-text-muted)]">
                <th className="p-3">Username</th>
                <th className="p-3">Email</th>
                <th className="p-3">ELO</th>
                <th className="p-3">Status</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--hub-border)]/80">
                  <td className="p-3 text-[var(--hub-text)]">{u.username ?? "—"}</td>
                  <td className="p-3 text-[var(--hub-text-muted)]">{u.email ?? "—"}</td>
                  <td className="p-3 text-[var(--hub-text)]">{u.elo}</td>
                  <td className="p-3">
                    {u.isBanned || u.bannedUntil ? (
                      <span className="text-[var(--hub-accent-red)]">Banido</span>
                    ) : u.isOnline ? (
                      <span className="text-[var(--hub-accent)]">Online</span>
                    ) : (
                      <span className="text-[var(--hub-text-muted)]">Offline</span>
                    )}
                  </td>
                  <td className="p-3 flex flex-wrap gap-2 items-center">
                    {u.riotId && u.tagline && (
                      <button
                        type="button"
                        onClick={() => syncUserElo(u)}
                        disabled={syncingElo === u.id}
                        className="text-xs text-[var(--hub-accent)] hover:underline disabled:opacity-50"
                      >
                        {syncingElo === u.id ? "Sincronizando…" : "Atualizar ELO"}
                      </button>
                    )}
                    {u.isBanned || u.bannedUntil ? (
                      <button
                        onClick={() => unban(u.id)}
                        disabled={unbanning === u.id}
                        className="text-[var(--hub-accent)] hover:underline disabled:opacity-50"
                      >
                        {unbanning === u.id ? "..." : "Desbanir"}
                      </button>
                    ) : (
                      <button
                        onClick={() => openBanModal(u)}
                        disabled={!!banning}
                        className="text-[var(--hub-accent-red)] hover:underline disabled:opacity-50"
                      >
                        Banir / Suspender
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="p-6 text-center text-[var(--hub-text-muted)]">Nenhum usuário encontrado.</p>
          )}
        </div>
      )}

      {banModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !banning && setBanModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6 clip-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[var(--hub-text)]">
              Banir / Suspender — {banModal.user.username ?? banModal.user.email}
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--hub-text-muted)] mb-1">Motivo</label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full rounded-lg border border-[var(--hub-border)] bg-black/30 px-3 py-2 text-sm text-[var(--hub-text)]"
                  placeholder="Violação das regras"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--hub-text-muted)] mb-1">Duração</label>
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="w-full rounded-lg border border-[var(--hub-border)] bg-black/30 px-3 py-2 text-sm text-[var(--hub-text)]"
                >
                  {BAN_DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => !banning && setBanModal(null)}
                className="rounded-lg border border-[var(--hub-border)] px-4 py-2 text-sm text-[var(--hub-text)] hover:bg-[var(--hub-bg)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitBan}
                disabled={!!banning}
                className="rounded-lg bg-[var(--hub-accent-red)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {banning ? "Aplicando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
