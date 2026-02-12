"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function TwoFactorPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: useRecovery ? undefined : code,
          recovery_code: useRecovery ? recoveryCode : undefined,
          callback_url: callbackUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Código inválido. Tente novamente.");
        return;
      }
      window.location.href = data.redirect_url ?? callbackUrl;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-md">
        <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 mb-8">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
            Autenticação em duas etapas
          </h1>
          <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
            Digite o código do seu aplicativo ou um código de recuperação
          </p>
        </div>

        <div
          className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl clip-card"
          style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="p-3 rounded-lg text-sm border border-red-500/30 bg-red-500/10 text-red-400"
                role="alert"
              >
                {error}
              </div>
            )}

            {!useRecovery ? (
              <>
                <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)]">
                  Código 2FA
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white text-center text-2xl tracking-[0.5em] placeholder-[var(--hub-text-muted)] focus:border-[var(--hub-accent)] focus:outline-none clip-button"
                />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)]">
                  Código de recuperação
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="xxxxxxxx-xxxxxxxx"
                  className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white placeholder-[var(--hub-text-muted)] focus:border-[var(--hub-accent)] focus:outline-none clip-button"
                />
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setUseRecovery(!useRecovery);
                setError(null);
                setCode("");
                setRecoveryCode("");
              }}
              className="text-sm text-[var(--hub-accent)] hover:underline"
            >
              {useRecovery ? "Usar código do app" : "Usar código de recuperação"}
            </button>

            <button
              type="submit"
              disabled={loading || (!useRecovery && code.length < 6) || (useRecovery && !recoveryCode.trim())}
              className="w-full py-4 px-6 border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 hover:bg-[var(--hub-accent)] text-white font-bold uppercase tracking-widest text-sm transition-all clip-button disabled:opacity-50"
            >
              {loading ? "Verificando…" : "Continuar"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-[var(--hub-accent)] hover:underline">
            ← Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
