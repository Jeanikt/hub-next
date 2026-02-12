"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROLES } from "@/src/lib/roles";

export default function ProfileEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [riotId, setRiotId] = useState("");
  const [tagline, setTagline] = useState("");
  const [image, setImage] = useState("");
  const [profileBackgroundUrl, setProfileBackgroundUrl] = useState("");
  const [favoriteChampion, setFavoriteChampion] = useState("");
  const [primaryRole, setPrimaryRole] = useState<string>("");
  const [secondaryRole, setSecondaryRole] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && session?.user) {
      setName((session.user as { name?: string }).name ?? "");
      setUsername((session.user as { username?: string }).username ?? "");
      setImage((session.user as { image?: string }).image ?? "");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setName(d.name ?? "");
          setUsername(d.username ?? "");
          setRiotId(d.riotId ?? "");
          setTagline(d.tagline ?? "");
          setImage(d.image ?? "");
          setProfileBackgroundUrl(d.profileBackgroundUrl ?? "");
          setFavoriteChampion(d.favoriteChampion ?? "");
          setPrimaryRole(d.primaryRole ?? "");
          setSecondaryRole(d.secondaryRole ?? "");
        }
      })
      .catch(() => {});
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          username: username || undefined,
          riotId: riotId || null,
          tagline: tagline || null,
          image: image || undefined,
          profileBackgroundUrl: profileBackgroundUrl || null,
          favoriteChampion: favoriteChampion || null,
          primaryRole: primaryRole || null,
          secondaryRole: secondaryRole || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Erro ao salvar.");
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || !session) {
    return (
      <div className="flex justify-center py-12">
        <div className="hub-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--hub-accent)]">
          Configurações
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">
          Editar perfil
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1">
          Nome, username, foto, background, funções na fila e campeão favorito.
        </p>
      </div>

      <div
        className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl clip-card"
        style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg text-sm border border-red-500/30 bg-red-500/10 text-red-400" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg text-sm border border-green-500/30 bg-green-500/10 text-green-400" role="alert">
              Perfil atualizado.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button"
              placeholder="Seu nome"
            />
          </div>
          <div>
            <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              pattern="[a-zA-Z0-9_-]+"
              className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button"
              placeholder="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
              Riot ID
            </label>
            <input
              type="text"
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button"
              placeholder="Nome#BR1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
              Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={10}
              className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button"
              placeholder="BR1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
              URL da foto (avatar)
            </label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
              Background do perfil (imagem ou GIF)
            </label>
            <input
              type="url"
              value={profileBackgroundUrl}
              onChange={(e) => setProfileBackgroundUrl(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
              Campeão favorito
            </label>
            <input
              type="text"
              value={favoriteChampion}
              onChange={(e) => setFavoriteChampion(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button"
              placeholder="Ex: Jett, Sage..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
                Função primária (fila)
              </label>
              <select
                value={primaryRole}
                onChange={(e) => setPrimaryRole(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button"
              >
                <option value="">—</option>
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
                Função secundária (fila)
              </label>
              <select
                value={secondaryRole}
                onChange={(e) => setSecondaryRole(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button"
              >
                <option value="">—</option>
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 hover:bg-[var(--hub-accent)] text-white font-bold uppercase tracking-widest text-sm transition-all clip-button disabled:opacity-50"
          >
            {loading ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm">
        <Link href="/dashboard" className="text-[var(--hub-accent)] hover:underline">
          ← Voltar ao Dashboard
        </Link>
      </p>
    </div>
  );
}
