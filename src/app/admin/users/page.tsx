"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string | null;
  username: string | null;
  email: string;
  elo: number;
  isOnline: boolean;
  isBanned: boolean;
  bannedUntil: string | null;
  banReason: string | null;
  createdAt: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [banning, setBanning] = useState<number | null>(null);
  const [unbanning, setUnbanning] = useState<number | null>(null);

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

  async function ban(id: number) {
    const reason = prompt("Motivo do banimento:");
    if (reason == null) return;
    setBanning(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: reason || "Violação das regras" }),
      });
      if (res.ok) fetchUsers();
    } finally {
      setBanning(null);
    }
  }

  async function unban(id: number) {
    setUnbanning(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/unban`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) fetchUsers();
    } finally {
      setUnbanning(null);
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
                <th className="p-3">ID</th>
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
                  <td className="p-3 text-[var(--hub-text-muted)]">{u.id}</td>
                  <td className="p-3 text-[var(--hub-text)]">{u.username ?? "—"}</td>
                  <td className="p-3 text-[var(--hub-text-muted)]">{u.email}</td>
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
                  <td className="p-3 flex gap-2">
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
                        onClick={() => ban(u.id)}
                        disabled={banning === u.id}
                        className="text-[var(--hub-accent-red)] hover:underline disabled:opacity-50"
                      >
                        {banning === u.id ? "..." : "Banir"}
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
    </div>
  );
}
