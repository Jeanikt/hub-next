"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetType: string;
  targetId: string;
  targetLabel: string;
  onSuccess?: () => void;
};

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetLabel,
  onSuccess,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = reason.trim();
    if (!r) {
      setMessage({ type: "error", text: "Informe o motivo do report." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetType, targetId, reason: r }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "success", text: data?.message ?? "Report enviado. Nossa equipe analisará em breve." });
        setReason("");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setMessage({ type: "error", text: data?.message ?? "Erro ao enviar report." });
      }
    } catch {
      setMessage({ type: "error", text: "Erro ao enviar report." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6 shadow-xl"
        role="dialog"
        aria-labelledby="report-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="report-title" className="text-lg font-bold uppercase tracking-tight text-[var(--hub-text)] flex items-center gap-2">
            <Flag size={20} className="text-[var(--hub-accent-red)]" />
            Reportar jogador
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-[var(--hub-text-muted)] mb-4">
          Reportando: <span className="font-medium text-[var(--hub-text)]">{targetLabel}</span>
        </p>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-[var(--hub-text-muted)] mb-2">
            Motivo *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo do report (comportamento inadequado, trapaça, etc.)"
            rows={4}
            className="w-full px-4 py-3 bg-black/30 border border-[var(--hub-border)] text-white rounded-lg placeholder-[var(--hub-text-muted)] focus:border-[var(--hub-accent)] focus:outline-none resize-none"
            disabled={loading}
          />
          {message && (
            <p
              className={`mt-2 text-sm ${message.type === "success" ? "text-[var(--hub-accent)]" : "text-red-400"}`}
              role="alert"
            >
              {message.text}
            </p>
          )}
          <div className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[var(--hub-accent-red)]/20 text-[var(--hub-accent-red)] border border-[var(--hub-accent-red)]/50 hover:bg-[var(--hub-accent-red)]/30 font-medium disabled:opacity-50"
            >
              {loading ? "Enviando…" : "Enviar report"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
