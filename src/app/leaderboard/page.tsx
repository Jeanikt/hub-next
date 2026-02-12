import Link from "next/link";
import { type Metadata } from "next";
import { prisma } from "@/src/lib/prisma";

export const metadata: Metadata = {
  title: "Ranking e Leaderboard",
  description: "Ranking dos melhores players por ELO no HUBEXPRESSO. Veja nível, rank e posição no leaderboard de Valorant.",
  openGraph: { title: "Leaderboard – HUBEXPRESSO", description: "Ranking por ELO dos players." },
};

async function getLeaderboard() {
  const data = await prisma.user.findMany({
    where: { username: { not: null }, isBanned: false },
    select: { id: true, username: true, name: true, image: true, elo: true, level: true, rank: true },
    orderBy: { elo: "desc" },
    take: 50,
  });
  return data.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    avatarUrl: u.image,
    elo: u.elo,
    level: u.level,
    rank: u.rank,
  }));
}

export default async function LeaderboardPage() {
  const data = await getLeaderboard();

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Leaderboard
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
          Ranking por ELO
        </p>
      </div>

      <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] rounded-2xl overflow-hidden clip-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--hub-border)]">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">#</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Jogador</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">ELO</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Nível</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">Rank</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--hub-text-muted)]">
                    Nenhum jogador no ranking ainda.
                  </td>
                </tr>
              )}
              {data.map((u, i) => (
                <tr key={u.id} className="border-b border-[var(--hub-border)] hover:bg-white/5 transition">
                  <td className="px-4 py-3 text-[var(--hub-text-muted)] font-mono">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={u.username ? `/users/${encodeURIComponent(u.username)}` : "#"}
                      className="flex items-center gap-3 text-white hover:text-[var(--hub-accent)] transition"
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-[var(--hub-accent)]/20 flex items-center justify-center text-xs font-bold">
                          {(u.username ?? u.name ?? "?")[0]?.toUpperCase()}
                        </span>
                      )}
                      <span>{u.username ?? u.name ?? "—"}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--hub-accent)]">{u.elo}</td>
                  <td className="px-4 py-3 text-[var(--hub-text)]">{u.level}</td>
                  <td className="px-4 py-3 text-[var(--hub-text-muted)]">{u.rank ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
