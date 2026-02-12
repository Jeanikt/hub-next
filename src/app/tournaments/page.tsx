import Link from "next/link";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Torneios | HUBEXPRESSO",
  description: "Torneios – HUBEXPRESSO",
};

export default async function TournamentsPage() {
  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Torneios
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
          Participe de torneios e competições
        </p>
      </div>

      <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl clip-card text-center">
        <p className="text-[var(--hub-text-muted)]">
          Em breve: listagem de torneios. Acompanhe as redes para novidades.
        </p>
      </div>
    </div>
  );
}
