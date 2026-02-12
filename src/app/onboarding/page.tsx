"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(session?.user?.name ?? "");
  const [username, setUsername] = useState("");
  const [riotId, setRiotId] = useState("");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string[]; username?: string[]; riotId?: string[]; tagline?: string[] }>({});

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="hub-loading-spinner" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  async function saveProfile() {
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Erro ao salvar");
        if (data.errors && typeof data.errors === "object") {
          setFieldErrors(data.errors);
        }
        return;
      }
      await updateSession({ username: data.username, onboardingCompleted: false });
      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  async function saveRiotAndComplete() {
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/riot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riotId: riotId.trim(), tagline: tagline.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Erro ao salvar");
        if (data.errors && typeof data.errors === "object") {
          setFieldErrors(data.errors);
        }
        return;
      }
      await completeOnboarding();
    } finally {
      setLoading(false);
    }
  }

  async function completeOnboarding() {
    const res = await fetch("/api/onboarding/complete", { method: "POST" });
    if (!res.ok) return;
    await updateSession({ onboardingCompleted: true });
    router.push("/dashboard");
    router.refresh();
  }

  async function skipOnboarding() {
    setLoading(true);
    await fetch("/api/onboarding/skip", { method: "POST" });
    await updateSession({ onboardingCompleted: true });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative z-10 max-w-2xl mx-auto">
      <header className="border-b border-[var(--hub-border)] bg-[var(--hub-bg)]/95 backdrop-blur-sm mb-8">
        <div className="border-l-4 border-[var(--hub-accent)] pl-4 py-3">
          <h1 className="text-2xl font-black text-[var(--hub-accent)] uppercase tracking-widest">
            HUBEXPRESSO
          </h1>
          <p className="text-[var(--hub-text-muted)] mt-1 text-sm">
            Complete seu perfil para começar a jogar
          </p>
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)] mt-2">
          Passo {step} de 2
        </p>
      </header>

      <div className="bg-[var(--hub-bg-card)] border border-[var(--hub-border)] p-8 rounded-2xl">
        {step === 1 && (
          <>
            <h2 className="text-xl font-black uppercase tracking-wide text-white mb-2">
              Crie seu perfil
            </h2>
            <p className="text-[var(--hub-text-muted)] mb-6 text-sm">
              Escolha um nome de exibição e um @username único.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome de exibição *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
                  placeholder="Como você quer ser chamado?"
                  className={`w-full px-4 py-3 bg-black/40 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)] ${fieldErrors.name ? "border-red-500" : "border-[var(--hub-border)]"}`}
                />
                {fieldErrors.name?.[0] && <p className="mt-1 text-sm text-red-400">{fieldErrors.name[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">@username *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setFieldErrors((prev) => ({ ...prev, username: undefined })); }}
                  placeholder="escolha-um-nome"
                  className={`w-full px-4 py-3 bg-black/40 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)] ${fieldErrors.username ? "border-red-500" : "border-[var(--hub-border)]"}`}
                />
                <p className="text-xs text-gray-500 mt-1">Letras, números e _ apenas.</p>
                {fieldErrors.username?.[0] && <p className="mt-1 text-sm text-red-400">{fieldErrors.username[0]}</p>}
              </div>
            </div>
            {error && !fieldErrors.name?.length && !fieldErrors.username?.length && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <div className="flex justify-between pt-6 border-t border-[var(--hub-border)] mt-6">
              <button
                type="button"
                onClick={skipOnboarding}
                disabled={loading}
                className="px-6 py-3 text-[var(--hub-text-muted)] hover:text-white transition font-medium"
              >
                Pular tudo
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={loading || !name.trim() || !username.trim()}
                className="px-8 py-3 rounded-lg font-bold uppercase tracking-wider bg-[var(--hub-accent)] hover:opacity-90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition clip-button"
              >
                {loading ? "Salvando..." : "Continuar"}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-black uppercase tracking-wide text-white mb-2">
              Riot ID (opcional)
            </h2>
            <p className="text-[var(--hub-text-muted)] mb-6 text-sm">
              Vincule seu Riot ID para partidas no Valorant.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome do jogo</label>
                <input
                  type="text"
                  value={riotId}
                  onChange={(e) => { setRiotId(e.target.value); setFieldErrors((prev) => ({ ...prev, riotId: undefined })); }}
                  placeholder="Nome#tag"
                  className={`w-full px-4 py-3 bg-black/40 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)] ${fieldErrors.riotId ? "border-red-500" : "border-[var(--hub-border)]"}`}
                />
                {fieldErrors.riotId?.[0] && <p className="mt-1 text-sm text-red-400">{fieldErrors.riotId[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => { setTagline(e.target.value); setFieldErrors((prev) => ({ ...prev, tagline: undefined })); }}
                  placeholder="BR1"
                  className={`w-full px-4 py-3 bg-black/40 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)] ${fieldErrors.tagline ? "border-red-500" : "border-[var(--hub-border)]"}`}
                />
                {fieldErrors.tagline?.[0] && <p className="mt-1 text-sm text-red-400">{fieldErrors.tagline[0]}</p>}
              </div>
            </div>
            {error && !fieldErrors.riotId?.length && !fieldErrors.tagline?.length && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <div className="flex justify-between pt-6 border-t border-[var(--hub-border)] mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 text-[var(--hub-text-muted)] hover:text-white transition font-medium"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={riotId.trim() || tagline.trim() ? saveRiotAndComplete : completeOnboarding}
                disabled={loading}
                className="px-8 py-3 rounded-lg font-bold uppercase tracking-wider bg-[var(--hub-accent)] hover:opacity-90 text-white disabled:opacity-50 clip-button"
              >
                {loading ? "Salvando..." : "Concluir"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
