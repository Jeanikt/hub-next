"use client";

import { useEffect, useState } from "react";
import { Link2, Copy, Users, Zap } from "lucide-react";

export function DashboardInviteCard() {
  const [data, setData] = useState<{ inviteCode: string; inviteLink: string; referralCount: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals/me", { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(data!.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6" style={{ borderTopWidth: "4px", borderTopColor: "var(--hub-accent)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <Link2 size={22} className="text-[var(--hub-accent)]" />
        <h2 className="text-lg font-bold uppercase tracking-tight text-[var(--hub-text)]">
          Convide amigos e ganhe XP
        </h2>
      </div>
      <p className="mt-1 text-sm text-[var(--hub-text-muted)]">
        Cada amigo que se cadastrar pelo seu link vale <strong className="text-[var(--hub-accent)]">100 XP</strong>. Convidando 10 amigos você completa a missão e ganha mais <strong className="text-[var(--hub-accent)]">1000 XP</strong>.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 min-w-0 items-center gap-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)]/50 px-3 py-2">
          <span className="truncate text-sm text-[var(--hub-text)] font-mono">{data.inviteLink}</span>
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center gap-2 rounded-lg border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent)] hover:bg-[var(--hub-accent)] hover:text-white transition-colors"
        >
          <Copy size={18} />
          {copied ? "Copiado!" : "Copiar link"}
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--hub-text-muted)]">
        Código: <span className="font-mono text-[var(--hub-text)]">{data.inviteCode}</span>
      </p>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <Users size={18} className="text-[var(--hub-accent)]" />
        <span className="text-[var(--hub-text)]">
          <strong>{data.referralCount}</strong> amigo{data.referralCount !== 1 ? "s" : ""} convidado{data.referralCount !== 1 ? "s" : ""}
        </span>
        {data.referralCount < 10 && (
          <span className="text-[var(--hub-text-muted)]">
            · Faltam {10 - data.referralCount} para a missão bônus
          </span>
        )}
      </div>
    </div>
  );
}
