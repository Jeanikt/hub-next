"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [targetType, setTargetType] = useState<"user" | "match" | "other">("user");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="hub-loading-spinner" />
      </div>
    );
  }
  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId.trim() || undefined,
          reason: reason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Erro ao enviar report.");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center py-12">
        <div className="hub-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Reportar
        </h1>
        <p className="text-sm text-[var(--hub-text-muted)] mt-1 uppercase tracking-wider">
          Envie uma denúncia para a moderação
        </p>
      </div>

      <div
        className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl clip-card"
        style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}
      >
        {sent ? (
          <p className="text-[var(--hub-text)] text-center">
            Report enviado. Nossa equipe analisará em breve.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg text-sm border border-red-500/30 bg-red-500/10 text-red-400" role="alert">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
                Tipo
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as "user" | "match" | "other")}
                className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button"
              >
                <option value="user">Usuário</option>
                <option value="match">Partida</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
                ID ou referência (username, ID da partida, etc.)
              </label>
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button"
                placeholder="Ex: username ou matchId"
              />
            </div>
            <div>
              <label className="block text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] mb-2">
                Motivo (obrigatório)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white focus:border-[var(--hub-accent)] focus:outline-none clip-button resize-y"
                placeholder="Descreva o que aconteceu..."
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 hover:bg-[var(--hub-accent)] text-white font-bold uppercase tracking-widest text-sm transition-all clip-button disabled:opacity-50"
            >
              {loading ? "Enviando…" : "Enviar report"}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-sm">
        <Link href="/dashboard" className="text-[var(--hub-accent)] hover:underline">
          ← Voltar ao Dashboard
        </Link>
      </p>
    </div>
  );
}
