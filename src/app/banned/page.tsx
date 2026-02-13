import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BannedPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isBanned: true, bannedUntil: true, banReason: true },
  });

  if (!user) {
    redirect("/dashboard");
  }

  if (user.bannedUntil && new Date(user.bannedUntil) < new Date()) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { isBanned: false, bannedUntil: null, banReason: null },
    });
    redirect("/dashboard");
  }

  if (!user.isBanned && !user.bannedUntil) {
    redirect("/dashboard");
  }

  const until = user.bannedUntil
    ? new Date(user.bannedUntil).toLocaleDateString("pt-BR", {
        dateStyle: "long",
        timeZone: "America/Sao_Paulo",
      })
    : null;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-lg text-center">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-red-500/50 bg-red-500/10 mb-6"
          aria-hidden
        >
          <span className="text-4xl text-red-400">⛔</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-2">
          Acesso restrito
        </h1>
        <p className="text-[var(--hub-text-muted)] uppercase tracking-wider text-sm mb-6">
          Sua conta está temporariamente ou permanentemente suspensa
        </p>

        <div
          className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl clip-card text-left"
          style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}
        >
          {user.banReason && (
            <p className="text-[var(--hub-text)] mb-2">
              <span className="text-[var(--hub-text-muted)] uppercase text-xs tracking-wider">Motivo:</span>
              <br />
              {user.banReason}
            </p>
          )}
          {until && (
            <p className="text-[var(--hub-text-muted)] text-sm">
              Válido até: <span className="text-white">{until}</span>
            </p>
          )}
          <p className="mt-6 text-sm text-[var(--hub-text-muted)]">
            Em caso de dúvida ou recurso, entre em contato com o suporte.
          </p>
        </div>

        <p className="mt-6 text-sm">
          <Link href="/support" className="text-[var(--hub-accent)] hover:underline">
            Ir para Suporte
          </Link>
          {" · "}
          <Link href="/api/auth/signout" className="text-[var(--hub-text-muted)] hover:underline">
            Sair da conta
          </Link>
        </p>
      </div>
    </div>
  );
}
