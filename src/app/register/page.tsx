"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Registro é feito via Google (NextAuth). Redireciona para /login.
 */
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 mb-6">
        <h1 className="text-xl font-black uppercase tracking-tight text-white">
          Criar conta
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1">
          Redirecionando para o login com Google…
        </p>
      </div>
      <Link href="/login" className="text-[var(--hub-accent)] hover:underline">
        Ir para o login
      </Link>
    </div>
  );
}
