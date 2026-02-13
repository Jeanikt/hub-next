import Link from "next/link";
import { auth } from "@/src/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hub de players Valorant – Matchmaking e partidas competitivas",
  description:
    "O seu prime manda aqui. Matchmaking competitivo, partidas equilibradas por ELO, ranking justo e integração com conta Riot. Entre na comunidade HUBEXPRESSO.",
  openGraph: {
    title: "HUBEXPRESSO – Hub de players Valorant",
    description: "Matchmaking competitivo, partidas equilibradas e ranking por ELO. Jogue com seu nível.",
  },
};

export default async function Home() {
  const session = await auth();

  return (
    <div className="space-y-12">
      <section className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 relative">
        <div
          className="absolute -left-[5px] -top-1 w-2 h-2 rotate-45"
          style={{ background: "var(--hub-accent)" }}
        />
        <div
          className="absolute -left-[5px] -bottom-1 w-2 h-2 rotate-45"
          style={{ background: "var(--hub-accent)" }}
        />
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-2 leading-none">
          O seu prime{" "}
          <span
            className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--hub-accent)] to-[var(--hub-accent-soft)]"
          >
            manda aqui.
          </span>
        </h1>
        <p className="text-[var(--hub-text-muted)] font-medium tracking-widest uppercase text-sm mt-2">
          Matchmaking competitivo • Partidas equilibradas • Ranking justo
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div>
          <p className="text-[var(--hub-text-muted)] mb-8 text-lg leading-relaxed border-l-2 border-[var(--hub-border)] pl-6">
            Uma nova forma de jogar, competir e evoluir. Dispute partidas ranqueadas,
            jogue com elo equilibrado e suba no ranking mais justo do VALORANT.
          </p>
          <Link
            href={session?.user ? "/queue" : "/login"}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--hub-accent)] hover:opacity-90 text-white font-black uppercase tracking-widest text-sm transition clip-button"
          >
            {session?.user ? "Entrar na Fila" : "Jogar Agora"}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-6 hover:border-[var(--hub-accent)]/50 transition-colors">
            <p className="text-white font-bold uppercase tracking-wider">Fila</p>
            <p className="text-[var(--hub-text-muted)] text-sm mt-1">Encontre partidas com seu ELO</p>
          </div>
          <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-accent)]/50 p-6">
            <p className="text-[var(--hub-accent)] font-bold uppercase tracking-wider">Play</p>
            <p className="text-[var(--hub-text-muted)] text-sm mt-1">5v5 competitivo</p>
          </div>
          <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-6 hover:border-[var(--hub-accent)]/50 transition-colors">
            <p className="text-white font-bold uppercase tracking-wider">Amigos</p>
            <p className="text-[var(--hub-text-muted)] text-sm mt-1">Squads e mensagens</p>
          </div>
          <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-6">
            <p className="text-[var(--hub-accent)] font-bold uppercase tracking-wider">HUBEXPRESSO</p>
            <p className="text-[var(--hub-text-muted)] text-sm mt-1">100% integrado</p>
          </div>
        </div>
      </div>

      <section className="pt-12 border-t border-[var(--hub-border)]">
        <h2 className="text-2xl font-black uppercase tracking-widest mb-6 flex items-center gap-4">
          <span className="w-2 h-8 bg-[var(--hub-accent)]" />
          Como funciona
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", title: "Entre com Google", desc: "Uma conta, acesso total." },
            { n: "02", title: "Complete o onboarding", desc: "Perfil e Riot ID (opcional)." },
            { n: "03", title: "Fila e partidas", desc: "Matchmaking e jogatina." },
          ].map(({ n, title, desc }) => (
            <div
              key={n}
              className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 hover:border-[var(--hub-accent)]/50 transition-colors relative group"
            >
              <div className="text-5xl font-black text-white/5 absolute top-4 right-4 group-hover:text-[var(--hub-accent)]/10">
                {n}
              </div>
              <h3 className="text-white font-bold uppercase tracking-wide">{title}</h3>
              <p className="text-[var(--hub-text-muted)] text-sm mt-2">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
