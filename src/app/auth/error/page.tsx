"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

const MESSAGES: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: "Problema temporário no login",
    description:
      "Estamos ajustando o servidor. Por favor, tente novamente em alguns instantes. Se o problema continuar, nossa equipe já foi notificada.",
  },
  AccessDenied: {
    title: "Acesso negado",
    description: "Você não tem permissão para acessar esta página.",
  },
  Verification: {
    title: "Link inválido ou expirado",
    description: "O link de verificação pode ter expirado. Tente fazer login novamente ou solicite um novo link.",
  },
  Default: {
    title: "Algo deu errado",
    description: "Ocorreu um erro inesperado. Tente novamente ou volte à página inicial.",
  },
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "Default";
  const { title, description } = MESSAGES[error] ?? MESSAGES.Default;

  return (
    <div className="min-h-screen bg-[var(--hub-bg)] text-[var(--hub-text)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--hub-accent)]/20 flex items-center justify-center mb-6">
          <AlertCircle size={32} className="text-[var(--hub-accent)]" />
        </div>
        <h1 className="text-xl font-bold text-[var(--hub-text)] mb-2">{title}</h1>
        <p className="text-sm text-[var(--hub-text-muted)] mb-8">{description}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-5 py-3 text-sm font-bold text-[var(--hub-accent)] hover:bg-[var(--hub-accent)] hover:text-white transition"
          >
            <RefreshCw size={18} />
            Tentar login novamente
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-5 py-3 text-sm font-medium text-[var(--hub-text)] hover:border-[var(--hub-accent)]/50 transition"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
