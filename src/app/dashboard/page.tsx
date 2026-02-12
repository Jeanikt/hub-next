import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { toSafeUser } from "@/src/types/api";

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

  const safe = toSafeUser(user);

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--hub-accent)]">
          Painel
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
          Bem-vindo, {safe.username ?? safe.name ?? "agent"}.
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1">
          Acesse a fila, partidas e amigos pelo menu.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Nível", value: safe.level, color: "var(--hub-accent)" },
          { label: "XP", value: safe.xp, color: "var(--hub-text-muted)" },
          { label: "ELO", value: safe.elo, color: "var(--hub-accent-soft)" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-6 rounded-2xl"
            style={{ borderTopWidth: "4px", borderTopColor: color }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
              {label}
            </p>
            <p className="mt-2 text-3xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
