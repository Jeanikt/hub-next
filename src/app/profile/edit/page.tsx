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
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] clip-card">
        <div className="text-center">
          <div className="hub-loading-spinner mx-auto mb-4" />
          <p className="text-sm font-medium text-[var(--hub-text-muted)]">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <header className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--hub-accent)]">
          Configurações
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] md:text-3xl">
          Editar perfil
        </h1>
        <p className="mt-1 text-sm text-[var(--hub-text-muted)]">
          Nome, username, foto, background, funções na fila e campeão favorito.
        </p>
      </header>

      <div
        className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl clip-card"
        style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl text-sm border border-red-500/30 bg-red-500/10 text-red-400" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 rounded-xl text-sm border border-[var(--hub-accent)]/50 bg-[var(--hub-accent)]/10 text-[var(--hub-accent)]" role="alert">
              Perfil atualizado com sucesso.
            </div>
          )}

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)] border-b border-[var(--hub-border)] pb-2">
              Identificação
            </h2>
            <div>
              <label className="block text-sm font-medium text-[var(--hub-text-muted)] mb-1.5">
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white rounded-lg focus:border-[var(--hub-accent)] focus:outline-none transition-colors"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--hub-text-muted)] mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                pattern="[a-zA-Z0-9_-]+"
                className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white rounded-lg focus:border-[var(--hub-accent)] focus:outline-none transition-colors"
                placeholder="username"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)] border-b border-[var(--hub-border)] pb-2">
              Riot / Valorant
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--hub-text-muted)] mb-1.5">
                  Riot ID
                </label>
                <input
                  type="text"
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white rounded-lg focus:border-[var(--hub-accent)] focus:outline-none transition-colors"
                  placeholder="Nome#BR1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--hub-text-muted)] mb-1.5">
                  Tagline
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={10}
                  className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white rounded-lg focus:border-[var(--hub-accent)] focus:outline-none transition-colors"
                  placeholder="BR1"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)] border-b border-[var(--hub-border)] pb-2">
              Imagens
            </h2>
            <div>
              <label className="block text-sm font-medium text-[var(--hub-text-muted)] mb-1.5">
                URL da foto (avatar)
              </label>
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white rounded-lg focus:border-[var(--hub-accent)] focus:outline-none transition-colors"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--hub-text-muted)] mb-1.5">
                Background do perfil (URL)
              </label>
              <input
                type="url"
                value={profileBackgroundUrl}
                onChange={(e) => setProfileBackgroundUrl(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white rounded-lg focus:border-[var(--hub-accent)] focus:outline-none transition-colors"
                placeholder="https://..."
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)] border-b border-[var(--hub-border)] pb-2">
              Jogo
            </h2>
            <div>
              <label className="block text-sm font-medium text-[var(--hub-text-muted)] mb-1.5">
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
                <label className="block text-sm font-medium text-[var(--hub-text-muted)] mb-1.5">
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
                <label className="block text-sm font-medium text-[var(--hub-text-muted)] mb-1.5">
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
          </section>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 hover:bg-[var(--hub-accent)] text-white font-bold uppercase tracking-widest text-sm transition-all clip-button rounded-xl disabled:opacity-50"
          >
            {loading ? "Salvando…" : "Salvar perfil"}
          </button>
        </form>
      </div>

      <p className="mt-8 text-center">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)]">
          ← Voltar ao Dashboard
        </Link>
      </p>
    </div>
  );
}
