import { notFound } from "next/navigation";
import Link from "next/link";
import { type Metadata } from "next";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} | Torneios | HUBEXPRESSO`,
    description: `Torneio ${slug} – HUBEXPRESSO`,
  };
}

export default async function TournamentShowPage({ params }: Params) {
  const { slug } = await params;
  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Torneio: {slug}
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
          Detalhes em breve
        </p>
      </div>
      <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl clip-card text-center">
        <p className="text-[var(--hub-text-muted)]">Página do torneio em construção.</p>
      </div>
      <p className="text-center text-sm">
        <Link href="/tournaments" className="text-[var(--hub-accent)] hover:underline">
          ← Voltar aos torneios
        </Link>
      </p>
    </div>
  );
}
