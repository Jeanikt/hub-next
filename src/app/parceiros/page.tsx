import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Parceiros | HUBEXPRESSO",
  description: "Parceiros HUBEXPRESSO",
};

export default function ParceirosPage() {
  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Parceiros
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
          Conheça nossos parceiros
        </p>
      </div>

      <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl clip-card text-center">
        <p className="text-[var(--hub-text-muted)]">
          Em breve: listagem de parceiros e programas.
        </p>
      </div>
    </div>
  );
}
