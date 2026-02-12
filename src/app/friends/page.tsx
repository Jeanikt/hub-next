"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Friend = { id: number; username: string | null; name: string | null; avatarUrl: string | null; elo: number; isOnline: boolean };
type PendingSent = { id: number; friend: Friend };
type PendingReceived = { id: number; user: Friend };

type Data = {
  friends: Friend[];
  pendingSent: PendingSent[];
  pendingReceived: PendingReceived[];
};

export default function FriendsPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/friends", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) router.push("/login");
        return r.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  async function addFriend(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Erro ao adicionar.");
        return;
      }
      setUsername("");
      const r = await fetch("/api/friends", { credentials: "include" });
      setData(await r.json());
    } finally {
      setAdding(false);
    }
  }

  async function accept(id: number) {
    await fetch("/api/friends/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ friend_id: id }),
    });
    const r = await fetch("/api/friends", { credentials: "include" });
    setData(await r.json());
  }

  async function reject(id: number) {
    await fetch("/api/friends/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ friend_id: id }),
    });
    const r = await fetch("/api/friends", { credentials: "include" });
    setData(await r.json());
  }

  async function remove(friendId: number) {
    if (!confirm("Remover amizade?")) return;
    await fetch("/api/friends/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ friend_id: friendId }),
    });
    const r = await fetch("/api/friends", { credentials: "include" });
    setData(await r.json());
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)]">
        <div className="hub-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--hub-accent)]">Rede</p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">Amigos</h1>
      </div>

      <form onSubmit={addFriend} className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username do amigo"
          className="flex-1 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-3 py-2 text-sm text-[var(--hub-text)] placeholder:text-[var(--hub-text-muted)] clip-button"
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-4 py-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent)] hover:bg-[var(--hub-accent)] hover:text-white disabled:opacity-50 clip-button"
        >
          {adding ? "Enviando..." : "Adicionar"}
        </button>
      </form>
      {error && <p className="text-sm text-[var(--hub-accent-red)]">{error}</p>}

      {data.pendingReceived.length > 0 && (
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 clip-card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Pedidos recebidos</h2>
          <ul className="space-y-2">
            {data.pendingReceived.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <Link href={`/messages/${p.user.username ?? p.user.id}`} className="text-[var(--hub-text)] hover:text-[var(--hub-accent)] hover:underline">
                  {p.user.username ?? p.user.name ?? `#${p.user.id}`}
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => accept(p.id)}
                    className="rounded-lg bg-[var(--hub-accent)]/20 px-2 py-1 text-xs font-medium text-[var(--hub-accent)] hover:bg-[var(--hub-accent)]/30"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => reject(p.id)}
                    className="rounded-lg bg-[var(--hub-accent-red)]/20 px-2 py-1 text-xs text-[var(--hub-accent-red)] hover:bg-[var(--hub-accent-red)]/30"
                  >
                    Rejeitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 clip-card">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Seus amigos</h2>
        {data.friends.length === 0 ? (
          <p className="text-[var(--hub-text-muted)]">Nenhum amigo ainda.</p>
        ) : (
          <ul className="space-y-2">
            {data.friends.map((f) => (
              <li key={f.id} className="flex items-center justify-between">
                <Link
                  href={`/messages/${f.username ?? f.id}`}
                  className="flex items-center gap-2 text-[var(--hub-text)] hover:text-[var(--hub-accent)] hover:underline"
                >
                  <span className={`h-2 w-2 rounded-full ${f.isOnline ? "bg-[var(--hub-accent)]" : "bg-[var(--hub-text-muted)]"}`} />
                  {f.username ?? f.name ?? `#${f.id}`} · ELO {f.elo}
                </Link>
                <button
                  onClick={() => remove(f.id)}
                  className="text-xs text-[var(--hub-text-muted)] hover:text-[var(--hub-accent-red)]"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
