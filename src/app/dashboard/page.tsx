import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { toSafeUser } from "@/src/types/api";
import { DashboardInviteCard } from "./DashboardInviteCard";

export const dynamic = "force-dynamic";
import {
  Trophy,
  Target,
  Skull,
  Zap,
  TrendingUp,
  Award,
  Swords,
  BarChart3,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      image: true,
      rank: true,
      xp: true,
      elo: true,
      level: true,
      isAdmin: true,
      onboardingCompleted: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  let participants: { kills: number; deaths: number; assists: number; score: number; team: string | null; gameMatch: { winnerTeam: string | null; status: string } }[] = [];
  try {
    participants = await prisma.gameMatchUser.findMany({
      where: { userId: session.user.id },
      include: {
        gameMatch: {
          select: { winnerTeam: true, status: true },
        },
      },
    });
  } catch {
    // Tabela game_match_user pode não existir
  }

  const finished = participants.filter((p) => p.gameMatch.status === "finished");
  const wins = finished.filter(
    (p) => p.team && p.gameMatch.winnerTeam && p.team === p.gameMatch.winnerTeam
  ).length;
  const losses = finished.length - wins;
  const totalKills = participants.reduce((s, p) => s + p.kills, 0);
  const totalDeaths = participants.reduce((s, p) => s + p.deaths, 0);
  const totalAssists = participants.reduce((s, p) => s + p.assists, 0);
  const totalScore = participants.reduce((s, p) => s + p.score, 0);
  const matchesPlayed = participants.length;
  const winRate = finished.length > 0 ? Math.round((wins / finished.length) * 100) : 0;
  const kda =
    totalDeaths > 0
      ? ((totalKills + totalAssists) / totalDeaths).toFixed(1)
      : totalKills + totalAssists > 0
        ? (totalKills + totalAssists).toFixed(1)
        : "—";
  const avgScore = matchesPlayed > 0 ? Math.round(totalScore / matchesPlayed) : 0;

  const safe = toSafeUser(user);

  const statCards = [
    { label: "Nível", value: String(safe.level), color: "var(--hub-accent)", icon: Trophy },
    { label: "XP", value: String(safe.xp), color: "var(--hub-text-muted)", icon: Zap },
    { label: "ELO", value: String(safe.elo), color: "var(--hub-accent-soft)", icon: TrendingUp },
  ];

  const matchStats = [
    { label: "Partidas", value: String(matchesPlayed), icon: Swords },
    { label: "Vitórias", value: String(wins), icon: Trophy },
    { label: "Derrotas", value: String(losses), icon: Skull },
    { label: "Taxa de vitória", value: `${winRate}%`, icon: BarChart3 },
    { label: "Kills totais", value: String(totalKills), icon: Target },
    { label: "Mortes", value: String(totalDeaths), icon: Skull },
    { label: "Assistências", value: String(totalAssists), icon: Award },
    { label: "KDA médio", value: String(kda), icon: TrendingUp },
    { label: "Score médio", value: String(avgScore), icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--hub-accent)]">
          Painel
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">
          Bem-vindo, {safe.username ?? safe.name ?? "agent"}.
        </h1>
        <p className="mt-1 text-sm text-[var(--hub-text-muted)]">
          Acesse a fila, partidas e amigos pelo menu.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map(({ label, value, color, icon: Icon }) => (
          <div
            key={label}
            className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-6 rounded-2xl clip-card"
            style={{ borderTopWidth: "4px", borderTopColor: color }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)] flex items-center gap-2">
              <Icon size={14} />
              {label}
            </p>
            <p className="mt-2 text-3xl font-black text-[var(--hub-text)]">{value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-bold uppercase tracking-tight text-[var(--hub-text)] border-l-4 border-[var(--hub-accent)] pl-4 mb-4">
          Estatísticas de partidas
        </h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {matchStats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-4 rounded-xl clip-card"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--hub-text-muted)] flex items-center gap-1.5">
                <Icon size={12} />
                {label}
              </p>
              <p className="mt-1 text-xl font-bold text-[var(--hub-text)]">{value}</p>
            </div>
          ))}
        </div>
        {/* Agente favorito / melhor winrate – exibidos se as colunas existirem no banco (após apply-missing-postgres.sql) */}
      </section>

      <DashboardInviteCard />
    </div>
  );
}
