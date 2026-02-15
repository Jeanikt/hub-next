import Link from "next/link";
import { type Metadata } from "next";
import { prisma } from "@/src/lib/prisma";
import { Trophy, Medal, Crown } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ranking e Leaderboard",
  description: "Ranking por HEX - Hub Expresso Rating no HUBEXPRESSO. Winrate, KDA e pódio dos melhores players.",
  openGraph: { title: "Leaderboard – HUBEXPRESSO", description: "Ranking por HEX - Hub Expresso Rating, winrate e KDA." },
};

type MatchStats = { total: number; wins: number; kills: number; deaths: number; assists: number };

async function getLeaderboardStats(): Promise<Map<string, MatchStats>> {
  const rows = await prisma.$queryRaw<Array<{ userId: string; total: number; wins: number; kills: number; deaths: number; assists: number }>>`
    SELECT gmu."userId",
      COUNT(*)::int AS total,
      SUM(CASE WHEN gmu.team = gm."winnerTeam" THEN 1 ELSE 0 END)::int AS wins,
      COALESCE(SUM(gmu.kills), 0)::int AS kills,
      COALESCE(SUM(gmu.deaths), 0)::int AS deaths,
      COALESCE(SUM(gmu.assists), 0)::int AS assists
    FROM game_match_user gmu
    INNER JOIN game_matches gm ON gm.id = gmu."gameMatchId"
    WHERE gm.status = 'finished'
    GROUP BY gmu."userId"
  `;
  const map = new Map<string, MatchStats>();
  for (const r of rows) {
    map.set(r.userId, {
      total: Number(r.total),
      wins: Number(r.wins),
      kills: Number(r.kills),
      deaths: Number(r.deaths),
      assists: Number(r.assists),
    });
  }
  return map;
}

async function getLeaderboard() {
  const data = await prisma.user.findMany({
    where: {
      username: { not: null },
      isBanned: false,
      onboardingCompleted: true,
    },
    select: { id: true, username: true, name: true, image: true, hex: true, elo: true, xp: true, level: true, rank: true },
    orderBy: [{ hex: "desc" }, { xp: "desc" }],
    take: 50,
  });
  const stats = await getLeaderboardStats();
  return data.map((u) => {
    const s = stats.get(u.id);
    const total = s?.total ?? 0;
    const wins = s?.wins ?? 0;
    const winrate = total > 0 ? (wins / total) * 100 : 0;
    const kda = s ? `${s.kills}/${s.deaths}/${s.assists}` : "—";
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      avatarUrl: u.image,
      hex: u.hex ?? 0,
      elo: u.elo,
      xp: u.xp ?? 0,
      level: u.level,
      rank: u.rank,
      winrate,
      totalMatches: total,
      kda,
    };
  });
}

function PodiumCard({
  position,
  username,
  name,
  avatarUrl,
  hex,
  winrate,
  kda,
  isTop1Day,
}: {
  position: 1 | 2 | 3;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  hex: number;
  winrate: number;
  kda: string;
  isTop1Day: boolean;
}) {
  const displayName = username ?? name ?? "—";
  const heights = { 1: "h-28", 2: "h-24", 3: "h-20" };
  const colors = {
    1: "from-amber-400/90 to-yellow-600/90 border-amber-400/50",
    2: "from-slate-300/90 to-slate-500/90 border-slate-400/50",
    3: "from-amber-700/90 to-amber-900/90 border-amber-600/50",
  };
  return (
    <div className="flex flex-col items-center">
      {isTop1Day && (
        <div className="mb-1 flex items-center gap-1 rounded-full bg-[var(--hub-accent)]/20 px-2 py-0.5 text-xs font-bold uppercase text-[var(--hub-accent)]">
          <Crown className="h-3.5 w-3.5" />
          Top 1 do dia
        </div>
      )}
      <Link
        href={username ? `/users/${encodeURIComponent(username)}` : "#"}
        className={`flex flex-col items-center rounded-2xl border-2 bg-gradient-to-b ${colors[position]} p-4 transition hover:opacity-95 ${heights[position]} justify-end min-h-[8rem] w-full max-w-[140px]`}
      >
        <span className="text-2xl font-black text-white drop-shadow">{position}º</span>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="mt-2 h-12 w-12 rounded-full border-2 border-white/80 object-cover" />
        ) : (
          <span className="mt-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/80 bg-white/30 text-lg font-bold text-white">
            {displayName[0]?.toUpperCase() ?? "?"}
          </span>
        )}
        <span className="mt-1 truncate max-w-full text-sm font-bold text-white drop-shadow">{displayName}</span>
        <span className="text-lg font-black text-white drop-shadow">{hex}</span>
        <span className="text-xs text-white/90">HEX</span>
        <span className="text-xs text-white/80">{winrate.toFixed(0)}% WR · {kda}</span>
      </Link>
    </div>
  );
}

export default async function LeaderboardPage() {
  const data = await getLeaderboard();
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);
  const top1Id = data[0]?.id;

  return (
    <div className="space-y-8">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] flex items-center gap-2">
          <Trophy size={28} className="text-[var(--hub-accent)]" />
          Leaderboard
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
          Ranking por HEX - Hub Expresso Rating · Winrate e KDA
        </p>
      </div>

      {/* Pódio: Top 3 */}
      {top3.length >= 1 && (
        <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6 clip-card">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
            <Medal className="h-4 w-4" />
            Pódio
          </h2>
          <div className="flex flex-wrap items-end justify-center gap-6 sm:gap-8">
            {top3[1] && (
              <PodiumCard
                position={2}
                username={top3[1].username}
                name={top3[1].name}
                avatarUrl={top3[1].avatarUrl}
                hex={top3[1].hex}
                winrate={top3[1].winrate}
                kda={top3[1].kda}
                isTop1Day={false}
              />
            )}
            {top3[0] && (
              <PodiumCard
                position={1}
                username={top3[0].username}
                name={top3[0].name}
                avatarUrl={top3[0].avatarUrl}
                hex={top3[0].hex}
                winrate={top3[0].winrate}
                kda={top3[0].kda}
                isTop1Day={true}
              />
            )}
            {top3[2] && (
              <PodiumCard
                position={3}
                username={top3[2].username}
                name={top3[2].name}
                avatarUrl={top3[2].avatarUrl}
                hex={top3[2].hex}
                winrate={top3[2].winrate}
                kda={top3[2].kda}
                isTop1Day={false}
              />
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] overflow-hidden clip-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]/50">
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">#</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Jogador</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">HEX</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Winrate</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">K/D/A</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Nível</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--hub-text-muted)]">
                    Nenhum jogador no ranking ainda.
                  </td>
                </tr>
              )}
              {(top3.length > 0 ? rest : data).map((u, i) => {
                const pos = top3.length > 0 ? i + 4 : i + 1;
                const isTop1 = u.id === top1Id;
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-[var(--hub-border)] transition ${isTop1 ? "bg-[var(--hub-accent)]/10" : "hover:bg-[var(--hub-accent)]/5"}`}
                  >
                    <td className="px-4 py-4 text-[var(--hub-text-muted)] font-mono font-bold">{pos}</td>
                    <td className="px-4 py-4">
                      <Link
                        href={u.username ? `/users/${encodeURIComponent(u.username)}` : "#"}
                        className="flex items-center gap-3 text-[var(--hub-text)] hover:text-[var(--hub-accent)] transition"
                      >
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-[var(--hub-border)]" />
                        ) : (
                          <span className="w-9 h-9 rounded-full bg-[var(--hub-accent)]/20 flex items-center justify-center text-sm font-bold border border-[var(--hub-border)]">
                            {(u.username ?? u.name ?? "?")[0]?.toUpperCase()}
                          </span>
                        )}
                        <span className="font-medium">{u.username ?? u.name ?? "—"}</span>
                        {isTop1 && (
                          <span className="flex items-center gap-1 rounded bg-[var(--hub-accent)]/20 px-1.5 py-0.5 text-xs font-bold text-[var(--hub-accent)]">
                            <Crown className="h-3 w-3" /> Top 1
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-[var(--hub-accent)]">{u.hex}</span>
                    </td>
                    <td className="px-4 py-4 text-[var(--hub-text)]">
                      {u.totalMatches > 0 ? `${u.winrate.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-4 font-mono text-[var(--hub-text-muted)]">{u.kda}</td>
                    <td className="px-4 py-4 text-[var(--hub-text)]">{u.level}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
