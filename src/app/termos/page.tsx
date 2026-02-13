import type { Metadata } from "next";
import Link from "next/link";
import { TermosViewTracker } from "./TermosViewTracker";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso do HUBEXPRESSO – Hub de players Valorant, matchmaking e partidas competitivas.",
  robots: "index, follow",
};

export default function TermosPage() {
  return (
    <article className="mx-auto max-w-3xl py-8">
      <TermosViewTracker />
      <header className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 mb-10">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[var(--hub-text)]">
          Termos de Uso
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1">
          HUBEXPRESSO – Última atualização: fevereiro de 2025
        </p>
      </header>

      <div className="prose prose-invert max-w-none space-y-8 text-[var(--hub-text)]">
        <section>
          <h2 className="text-lg font-bold text-[var(--hub-text)] border-b border-[var(--hub-border)] pb-2">
            1. Aceitação
          </h2>
          <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">
            Ao acessar ou usar o site e os serviços do HUBEXPRESSO (&quot;plataforma&quot;), você concorda com estes Termos de Uso.
            A plataforma oferece matchmaking e partidas relacionadas ao jogo Valorant, ranking por ELO e integração com conta Riot.
            Se não concordar, não utilize o serviço.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--hub-text)] border-b border-[var(--hub-border)] pb-2">
            2. Uso do serviço
          </h2>
          <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">
            Você deve usar a plataforma de forma lícita e em conformidade com as regras do jogo e da Riot Games.
            É proibido usar bots, manipular ranking, assediar outros usuários ou divulgar dados pessoais de terceiros.
            Reservamo-nos o direito de suspender ou banir contas em caso de violação.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--hub-text)] border-b border-[var(--hub-border)] pb-2">
            3. Conta e dados
          </h2>
          <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">
            O login pode ser feito via Google. Você é responsável por manter a confidencialidade da sua conta.
            Tratamos seus dados conforme nossa política de privacidade. Dados sensíveis (como informações de CPF, quando
            utilizados) são criptografados e nunca expostos em logs ou a terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--hub-text)] border-b border-[var(--hub-border)] pb-2">
            4. Propriedade e conteúdo
          </h2>
          <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">
            O conteúdo da plataforma (textos, layout, marca) é de propriedade do HUBEXPRESSO ou de licenciadores.
            Valorant e marcas relacionadas são de propriedade da Riot Games. Você não adquire direitos sobre a plataforma
            ao utilizá-la.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--hub-text)] border-b border-[var(--hub-border)] pb-2">
            5. Limitação de responsabilidade
          </h2>
          <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">
            A plataforma é oferecida &quot;como está&quot;. Não nos responsabilizamos por perdas indiretas, danos decorrentes do uso
            do jogo ou de terceiros, ou indisponibilidade temporária. Nos limites da lei, nossa responsabilidade está restrita
            ao que for permitido.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--hub-text)] border-b border-[var(--hub-border)] pb-2">
            6. Alterações
          </h2>
          <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">
            Podemos alterar estes termos a qualquer momento. O uso continuado após a publicação das alterações constitui
            aceitação. Em mudanças relevantes, podemos notificar por e-mail ou aviso na plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--hub-text)] border-b border-[var(--hub-border)] pb-2">
            7. Contato
          </h2>
          <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">
            Dúvidas sobre estes termos: utilize o canal de suporte disponível na plataforma ou a área de contato indicada no site.
          </p>
        </section>
      </div>

      <footer className="mt-12 pt-6 border-t border-[var(--hub-border)] flex flex-wrap gap-4">
        <Link
          href="/login"
          className="text-sm font-medium text-[var(--hub-accent)] hover:underline"
        >
          Voltar ao login
        </Link>
        <Link
          href="/"
          className="text-sm text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)]"
        >
          Início
        </Link>
      </footer>
    </article>
  );
}
