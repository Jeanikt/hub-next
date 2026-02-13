"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen bg-[var(--hub-bg)] text-[var(--hub-text)] flex flex-col items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-md">
        <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 mb-8">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
            Entrar
          </h1>
          <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
            Use sua conta Google para acessar o HUBEXPRESSO
          </p>
        </div>

        <div
          className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl"
          style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}
        >
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm border border-red-500/30 bg-red-500/10 text-red-400"
              role="alert"
            >
              {error === "OAuthAccountNotLinked"
                ? "Este e-mail já está vinculado a outra conta. Use o mesmo provedor."
                : error === "Configuration"
                  ? "Problema temporário no servidor. Nossa equipe foi notificada. Tente novamente em alguns instantes."
                  : "Falha ao entrar. Tente novamente."}
            </div>
          )}

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 border-2 border-[var(--hub-border)] hover:border-[var(--hub-accent)] bg-white/5 hover:bg-[var(--hub-accent)]/10 text-white font-bold uppercase tracking-widest text-sm transition-all clip-button"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar com Google
          </button>

          <p className="mt-6 text-center text-xs text-[var(--hub-text-muted)]">
            Ao continuar, você concorda com os termos de uso do HUBEXPRESSO.
          </p>
        </div>

        <p className="mt-6 text-center text-sm space-x-4">
          <Link href="/register" className="text-[var(--hub-accent)] hover:underline">
            Criar conta
          </Link>
          <Link href="/forgot-password" className="text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)] hover:underline">
            Esqueci a senha
          </Link>
          <Link href="/" className="text-[var(--hub-accent)] hover:underline">
            ← Início
          </Link>
        </p>
      </div>
    </div>
  );
}
