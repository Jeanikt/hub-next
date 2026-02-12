"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Heart,
  Users,
  Target,
  Trophy,
  Zap,
  Circle,
  ChevronLeft,
} from "lucide-react";

type XpProgress = {
  currentLevel: number;
  nextLevel: number;
  currentXpInLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
};

type Profile = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  avatarUrl: string | null;
  elo: string | null;
  level: number;
  xp: number;
  rank: string | null;
  riotId: string | null;
  tagline: string | null;
  primaryRole: string | null;
  secondaryRole: string | null;
  primaryRoleLabel: string;
  secondaryRoleLabel: string;
  profileBackgroundUrl: string | null;
  favoriteChampion: string | null;
  bestWinrateChampion: string | null;
  isOnline: boolean;
  friendsCount: number;
  likesCount: number;
  missionsCompletedCount: number;
  xpProgress: XpProgress;
};

export default function UserProfileClient({ username }: { username: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${encodeURIComponent(username)}/profile`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProfile(data);
        else setProfile(null);
      })
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (!session?.user?.id || !profile?.id) return;
    fetch(
      `/api/profile/like?targetUserId=${encodeURIComponent(profile.id)}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((d) => setLiked(!!d.liked))
      .catch(() => {});
  }, [session?.user?.id, profile?.id]);

  async function toggleLike() {
    if (!profile?.id || likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await fetch("/api/profile/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId: profile.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLiked(data.liked ?? false);
        setProfile((p) =>
          p ? { ...p, likesCount: data.likesCount ?? p.likesCount } : null
        );
      }
    } finally {
      setLikeLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] clip-card">
        <div className="text-center">
          <div className="hub-loading-spinner mx-auto mb-4" />
          <p className="text-sm font-medium text-[var(--hub-text-muted)]">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-10 text-center clip-card">
        <p className="text-[var(--hub-text)] font-medium">Perfil não encontrado.</p>
        <p className="mt-1 text-sm text-[var(--hub-text-muted)]">O usuário pode não existir ou ter sido banido.</p>
        <Link href="/users" className="mt-6 inline-flex items-center gap-1 text-[var(--hub-accent)] hover:underline">
          <ChevronLeft size={16} />
          Voltar à listagem
        </Link>
      </div>
    );
  }

  const displayName = profile.username ?? profile.name ?? "Jogador";
  const isOwnProfile = (session?.user as { id?: string })?.id === profile.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header com background */}
      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--hub-border)] clip-card"
        style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}
      >
        {profile.profileBackgroundUrl ? (
          <div className="absolute inset-0">
            <img
              src={profile.profileBackgroundUrl}
              alt=""
              className="h-52 w-full object-cover opacity-50 sm:h-64"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--hub-bg-card)] via-[var(--hub-bg-card)]/70 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--hub-accent)]/15 via-transparent to-[var(--hub-accent-cyan)]/10" />
        )}
        <div className="relative flex flex-col items-center px-6 pb-8 pt-10 sm:flex-row sm:items-end sm:gap-8 sm:pt-14">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-28 w-28 flex-shrink-0 rounded-full border-2 border-[var(--hub-border)] object-cover ring-4 ring-[var(--hub-bg-card)] shadow-xl sm:h-32 sm:w-32"
            />
          ) : (
            <span className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--hub-border)] bg-[var(--hub-accent)]/20 text-4xl font-black text-[var(--hub-accent)] ring-4 ring-[var(--hub-bg-card)] sm:h-32 sm:w-32">
              {displayName[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          <div className="mt-5 flex flex-1 flex-col items-center text-center sm:mt-0 sm:items-start sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] sm:text-3xl">
                {displayName}
              </h1>
              {profile.isOnline && (
                <span className="flex items-center gap-1.5 rounded-lg bg-[var(--hub-accent)]/20 px-2.5 py-1 text-xs font-medium text-[var(--hub-accent)]">
                  <Circle size={8} fill="currentColor" />
                  Online
                </span>
              )}
            </div>
            {profile.username && (
              <p className="mt-1 text-sm text-[var(--hub-text-muted)]">@{profile.username}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
              <span className="flex items-center gap-1.5 text-sm text-[var(--hub-text-muted)]">
                <Users size={16} />
                {profile.friendsCount} amigos
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[var(--hub-text-muted)]">
                <Heart size={16} />
                {profile.likesCount} curtidas
              </span>
              {!isOwnProfile && session?.user && (
                <button
                  type="button"
                  onClick={toggleLike}
                  disabled={likeLoading}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors clip-button ${
                    liked
                      ? "bg-[var(--hub-accent-red)]/20 text-[var(--hub-accent-red)]"
                      : "border border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:border-[var(--hub-accent)]/50 hover:text-[var(--hub-accent)]"
                  }`}
                >
                  <Heart size={16} className={liked ? "fill-current" : ""} />
                  {liked ? "Curtido" : "Curtir"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nível e XP */}
      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6 clip-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
            Nível {profile.xpProgress.currentLevel}
          </span>
          <span className="text-sm text-[var(--hub-text-muted)]">
            {profile.xpProgress.currentXpInLevel} / {profile.xpProgress.xpNeededForNext} XP
          </span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-[var(--hub-accent)] transition-all duration-500"
            style={{ width: `${profile.xpProgress.progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--hub-text-muted)]">
          Faltam {profile.xpProgress.xpNeededForNext - profile.xpProgress.currentXpInLevel} XP para o nível {profile.xpProgress.nextLevel}
        </p>
      </div>

      {/* Stats: ELO, rank, missões, funções, campeões */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 clip-card">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
            ELO / Rank
          </p>
          <p className="mt-2 text-xl font-bold text-[var(--hub-accent)]">{profile.elo ?? "—"}</p>
          {profile.rank && (
            <p className="text-sm text-[var(--hub-text)]">{profile.rank}</p>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 clip-card">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
            Missões concluídas
          </p>
          <p className="mt-2 flex items-center gap-2 text-xl font-bold text-[var(--hub-text)]">
            <Zap size={20} className="text-[var(--hub-accent)]" />
            {profile.missionsCompletedCount}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 clip-card">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
            Funções na fila
          </p>
          <p className="mt-2 flex items-center gap-2 text-[var(--hub-text)]">
            <Target size={18} />
            <span>{profile.primaryRoleLabel}</span>
            <span className="text-[var(--hub-text-muted)]">/</span>
            <span>{profile.secondaryRoleLabel}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 clip-card">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
            Campeão favorito
          </p>
          <p className="mt-2 font-medium text-[var(--hub-text)]">
            {profile.favoriteChampion ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 clip-card sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
            Maior winrate
          </p>
          <p className="mt-2 flex items-center gap-2 font-medium text-[var(--hub-text)]">
            <Trophy size={18} className="text-amber-400" />
            {profile.bestWinrateChampion ?? "—"}
          </p>
        </div>
      </div>

      {(profile.riotId || profile.tagline) && (
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 clip-card">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
            Riot ID
          </p>
          <p className="mt-2 font-mono text-[var(--hub-text)]">
            {profile.riotId}
            {profile.tagline ? `#${profile.tagline}` : ""}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
        {isOwnProfile && (
          <Link
            href="/profile/edit"
            className="rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent)] transition hover:bg-[var(--hub-accent)] hover:text-white clip-button"
          >
            Editar perfil
          </Link>
        )}
        <Link
          href="/users"
          className="flex items-center gap-1 text-sm text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)]"
        >
          <ChevronLeft size={16} />
          Voltar à listagem
        </Link>
      </div>
    </div>
  );
}
