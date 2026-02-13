"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--hub-bg)] text-[var(--hub-text)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
          <AlertTriangle size={32} className="text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-[var(--hub-text)] mb-2">
          Algo deu errado
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mb-8">
          Ocorreu um erro inesperado. Nossa equipe foi notificada. Você pode tentar novamente ou voltar ao início.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-5 py-3 text-sm font-bold text-[var(--hub-accent)] hover:bg-[var(--hub-accent)] hover:text-white transition"
          >
            <RefreshCw size={18} />
            Tentar novamente
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-5 py-3 text-sm font-medium text-[var(--hub-text)] hover:border-[var(--hub-accent)]/50 transition"
          >
            <Home size={18} />
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
