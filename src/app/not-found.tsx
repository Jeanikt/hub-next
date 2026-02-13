import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--hub-bg)] text-[var(--hub-text)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--hub-accent)]/20 flex items-center justify-center mb-6">
          <FileQuestion size={32} className="text-[var(--hub-accent)]" />
        </div>
        <h1 className="text-xl font-bold text-[var(--hub-text)] mb-2">
          Página não encontrada
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mb-8">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-5 py-3 text-sm font-bold text-[var(--hub-accent)] hover:bg-[var(--hub-accent)] hover:text-white transition"
        >
          <Home size={18} />
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
