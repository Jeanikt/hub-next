import { type Metadata } from "next";
import { UsersList } from "./UsersList";
import { prisma } from "@/src/lib/prisma";
import { Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Jogadores | HUBEXPRESSO",
  description: "Listagem de jogadores – HUBEXPRESSO",
};

export default async function UsersPage() {
  const totalPlayers = await prisma.user.count({
    where: { isBanned: false },
  });

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            Jogadores
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-3 py-1 text-sm font-medium text-[var(--hub-text-muted)]">
            <Users size={16} className="text-[var(--hub-accent)]" />
            {totalPlayers.toLocaleString("pt-BR")} no sistema
          </span>
        </div>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
          Encontre jogadores e veja perfis públicos
        </p>
      </div>

      <UsersList />
    </div>
  );
}
