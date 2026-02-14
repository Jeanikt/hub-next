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
  UserPlus,
  MessageCircle,
  Flag,
  BadgeCheck,
} from "lucide-react";
import { ReportModal } from "@/src/app/components/ReportModal";

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
  bio: string | null;
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
  profileBadge?: string | null;
  isVerified?: boolean;
};

type FriendStatus = "none" | "pending_sent" | "pending_received" | "friends" | "own" | null;

export default function UserProfileClient({ username }: { username: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
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
      .catch(() => { });
  }, [session?.user?.id, profile?.id]);

  useEffect(() => {
    if (!session?.user?.id || !profile?.username?.trim()) return;
    const myId = (session.user as { id?: string }).id;
    if (myId === profile.id) {
      setFriendStatus("own");
      return;
    }
    setFriendStatus(null);
    fetch(
      `/api/friends/status?username=${encodeURIComponent(profile.username)}`,
      { credentials: "include" }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.status) setFriendStatus(d.status);
        else setFriendStatus("none");
      })
      .catch(() => setFriendStatus("none"));
  }, [session?.user?.id, profile?.id, profile?.username]);

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

  async function sendFriendRequest() {
    if (!profile?.username?.trim() || friendLoading) return;
    setFriendLoading(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: profile.username }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFriendStatus("pending_sent");
      }
    } finally {
      setFriendLoading(false);
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
  const hasFullPageBg = Boolean(profile.profileBackgroundUrl);

  return (
    <div className="relative min-h-screen">
      {/* Fundo da página inteira (GIF/imagem) atrás de todos os componentes */}
      {hasFullPageBg && (
        <div className="fixed inset-0 z-0" aria-hidden>
          <img
            src={profile.profileBackgroundUrl!}
            alt=""
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-[var(--hub-bg)]/85"
            style={{ backgroundBlendMode: "multiply" }}
          />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-3xl space-y-6">
        {/* Header (gradiente quando há fundo full-page; senão mantém o visual anterior) */}
        <div
          className="relative overflow-hidden rounded-2xl clip-card"
        >
          {hasFullPageBg ? (
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--hub-bg-card)]/95 via-[var(--hub-bg-card)]/80 to-transparent" />
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
                <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] sm:text-3xl flex items-center gap-2">
                  {displayName}
                  {profile.isVerified === true && (
                    <span className="inline-flex items-center rounded-full bg-[var(--hub-accent)]/20 p-1" title="Verificado">
                      <BadgeCheck size={20} className="text-[var(--hub-accent)]" />
                    </span>
                  )}
                  {(profile.profileBadge ?? null) && (
                    <span className="rounded bg-[var(--hub-bg-elevated)] border border-[var(--hub-border)] px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
                      {profile.profileBadge === "dev" ? "Dev" : profile.profileBadge === "admin" ? "Admin" : profile.profileBadge === "mod" ? "Moderação" : profile.profileBadge === "streamer" ? "Streamer" : profile.profileBadge === "coach" ? "Coach" : profile.profileBadge === "pro" ? "Pro Player" : profile.profileBadge}
                    </span>
                  )}
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
                  <>
                    {friendStatus !== null && friendStatus !== "own" && (
                      (friendStatus === "none" ? (
                        <button
                          type="button"
                          onClick={sendFriendRequest}
                          disabled={friendLoading}
                          className="flex items-center gap-1.5 rounded-xl border border-[var(--hub-border)] px-3.5 py-2 text-sm font-medium text-[var(--hub-text-muted)] transition-colors hover:border-[var(--hub-accent)]/50 hover:text-[var(--hub-accent)] clip-button disabled:opacity-50"
                        >
                          <UserPlus size={16} />
                          {friendLoading ? "Enviando…" : "Enviar solicitação"}
                        </button>
                      ) : friendStatus === "pending_sent" ? (
                        <span className="flex items-center gap-1.5 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-elevated)] px-3.5 py-2 text-sm text-[var(--hub-text-muted)]">
                          <UserPlus size={16} />
                          Solicitação enviada
                        </span>
                      ) : friendStatus === "pending_received" ? (
                        <Link
                          href="/friends"
                          className="flex items-center gap-1.5 rounded-xl border border-[var(--hub-accent)]/50 bg-[var(--hub-accent)]/10 px-3.5 py-2 text-sm font-medium text-[var(--hub-accent)] transition-colors hover:bg-[var(--hub-accent)]/20 clip-button"
                        >
                          <UserPlus size={16} />
                          Responder pedido
                        </Link>
                      ) : friendStatus === "friends" ? (
                        <Link
                          href={`/messages/${encodeURIComponent(profile.username ?? "")}`}
                          className="flex items-center gap-1.5 rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-3.5 py-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent)] transition-colors hover:bg-[var(--hub-accent)] hover:text-white clip-button"
                        >
                          <MessageCircle size={16} />
                          Abrir chat
                        </Link>
                      ) : null)
                    )}
                    <button
                      type="button"
                      onClick={toggleLike}
                      disabled={likeLoading}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors clip-button ${liked
                        ? "bg-[var(--hub-accent-red)]/20 text-[var(--hub-accent-red)]"
                        : "border border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:border-[var(--hub-accent)]/50 hover:text-[var(--hub-accent)]"
                        }`}
                    >
                      <Heart size={16} className={liked ? "fill-current" : ""} />
                      {liked ? "Curtido" : "Curtir"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-[var(--hub-border)] px-3.5 py-2 text-sm font-medium text-[var(--hub-text-muted)] transition-colors hover:border-red-500/50 hover:text-red-400 clip-button"
                      title="Reportar jogador"
                    >
                      <Flag size={16} />
                      Reportar
                    </button>
                  </>
                )}
                {!isOwnProfile && profile && (
                  <ReportModal
                    isOpen={reportOpen}
                    onClose={() => setReportOpen(false)}
                    targetType="user"
                    targetId={profile.id}
                    targetLabel={profile.username ?? profile.name ?? "Jogador"}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {profile.bio && (
          <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6 clip-card">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
                Bio
              </span>
            </div>
            <p className="mt-2">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Pontos Hub e Nível */}
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6 clip-card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
              Pontos Hub · Nível {profile.xpProgress.currentLevel}
            </span>
            <span className="text-lg font-black text-[var(--hub-accent)]">
              {profile.xp} pts
            </span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-[var(--hub-accent)] transition-all duration-500"
              style={{ width: `${profile.xpProgress.progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--hub-text-muted)]">
            {profile.xpProgress.currentXpInLevel} / {profile.xpProgress.xpNeededForNext} XP neste nível · Faltam {profile.xpProgress.xpNeededForNext - profile.xpProgress.currentXpInLevel} XP para o nível {profile.xpProgress.nextLevel}
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
              Agente favorito
            </p>
            <p className="mt-2 font-medium text-[var(--hub-text)]">
              {profile.favoriteChampion ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 clip-card sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
              Agente com maior winrate
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
    </div>
  );
}
