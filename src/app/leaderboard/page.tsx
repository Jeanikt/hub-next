import Link from "next/link";
import { type Metadata } from "next";
import { prisma } from "@/src/lib/prisma";
import { Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ranking e Leaderboard",
  description: "Ranking dos melhores players por Pontos Hub e ELO no HUBEXPRESSO. Veja nível, pontos e posição no leaderboard.",
  openGraph: { title: "Leaderboard – HUBEXPRESSO", description: "Ranking por Pontos Hub e ELO dos players." },
};

async function getLeaderboard() {
  const data = await prisma.user.findMany({
    where: {
      username: { not: null },
      isBanned: false,
      onboardingCompleted: true,
    },
    select: { id: true, username: true, name: true, image: true, elo: true, xp: true, level: true, rank: true },
    orderBy: [{ xp: "desc" }, { elo: "desc" }],
    take: 50,
  });
  return data.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    avatarUrl: u.image,
    elo: u.elo,
    xp: u.xp ?? 0,
    level: u.level,
    rank: u.rank,
  }));
}

export default async function LeaderboardPage() {
  const data = await getLeaderboard();

  return (
    <div className="space-y-8">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] flex items-center gap-2">
          <Trophy size={28} className="text-[var(--hub-accent)]" />
          Leaderboard
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
          Ranking por Pontos Hub (XP) e ELO
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] overflow-hidden clip-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]/50">
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">#</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Jogador</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Pontos Hub</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">ELO</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Nível</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Rank</th>
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
              {data.map((u, i) => (
                <tr key={u.id} className="border-b border-[var(--hub-border)] hover:bg-[var(--hub-accent)]/5 transition">
                  <td className="px-4 py-4 text-[var(--hub-text-muted)] font-mono font-bold">
                    {i + 1}
                  </td>
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
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-bold text-[var(--hub-accent)]">{u.xp}</span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-[var(--hub-text)]">{u.elo}</td>
                  <td className="px-4 py-4 text-[var(--hub-text)]">{u.level}</td>
                  <td className="px-4 py-4 text-[var(--hub-text-muted)]">{u.rank ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
