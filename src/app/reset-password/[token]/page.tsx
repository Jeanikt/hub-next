"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== passwordConfirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, password_confirmation: passwordConfirmation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Link inválido ou expirado. Solicite um novo.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-md">
        <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 mb-8">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
            Nova senha
          </h1>
          <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
            Defina sua nova senha de acesso
          </p>
        </div>

        <div
          className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl clip-card"
          style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}
        >
          {success ? (
            <p className="text-[var(--hub-text)] text-center">
              Senha alterada com sucesso. Redirecionando para o login…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  className="p-3 rounded-lg text-sm border border-red-500/30 bg-red-500/10 text-red-400"
                  role="alert"
                >
                  {error}
                </div>
              )}
              <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)]">
                Nova senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white placeholder-[var(--hub-text-muted)] focus:border-[var(--hub-accent)] focus:outline-none clip-button"
                placeholder="Mínimo 8 caracteres"
              />
              <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)]">
                Confirmar senha
              </label>
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white placeholder-[var(--hub-text-muted)] focus:border-[var(--hub-accent)] focus:outline-none clip-button"
                placeholder="Repita a senha"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 hover:bg-[var(--hub-accent)] text-white font-bold uppercase tracking-widest text-sm transition-all clip-button disabled:opacity-50"
              >
                {loading ? "Salvando…" : "Redefinir senha"}
              </button>
            </form>
          )}
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
