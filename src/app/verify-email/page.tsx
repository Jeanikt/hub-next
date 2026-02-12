"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const id = searchParams.get("id");
  const hash = searchParams.get("hash");

  useEffect(() => {
    if (!id || !hash) {
      queueMicrotask(() => setStatus("error"));
      return;
    }
    let cancelled = false;
    fetch(`/api/auth/verify-email?id=${encodeURIComponent(id)}&hash=${encodeURIComponent(hash)}`, {
      method: "POST",
    })
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? "success" : "error");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [id, hash]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-md text-center">
        <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 mb-8 text-left">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
            Verificação de e-mail
          </h1>
          <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
            Confirmando seu endereço de e-mail
          </p>
        </div>

        <div
          className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl clip-card"
          style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}
        >
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <div className="hub-loading-spinner" />
              <p className="text-[var(--hub-text-muted)]">Verificando…</p>
            </div>
          )}
          {status === "success" && (
            <p className="text-[var(--hub-text)]">
              E-mail verificado com sucesso. Você já pode fazer login.
            </p>
          )}
          {status === "error" && (
            <p className="text-red-400">
              Link inválido ou expirado. Solicite um novo e-mail de verificação na sua conta.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-[var(--hub-accent)] hover:underline">
            Ir para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
