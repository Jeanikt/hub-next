"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { MessageCircle, Send, Users, Loader2 } from "lucide-react";
import { getQueueAliasFromId } from "@/src/lib/valorant";
import { getQueueDisplayName, getPlayersRequired, QUEUE_COLORS } from "@/src/lib/queues";
import { playMatchFoundSound, playAcceptPromptSound, notifyMatchFound } from "@/src/lib/useNotificationSound";

type QueuePlayer = {
  id: string;
  username: string | null;
  elo: number | null;
  level: number | null;
};

type QueueStatus = {
  inQueue: boolean;
  currentQueue: string | null;
  queuePlayers: QueuePlayer[];
  matchFound?: boolean;
  matchId?: string | null;
  pendingAccept?: boolean;
  acceptDeadline?: number;
};

type ChatMessage = { content: string; createdAt: string; authorLabel?: string; authorColor?: string };

export default function WaitingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const type = (params?.type as string) ?? "";

  const [data, setData] = useState<QueueStatus | null>(null);
  const [matchFoundAlert, setMatchFoundAlert] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [leavingQueue, setLeavingQueue] = useState(false);
  const [acceptSecondsLeft, setAcceptSecondsLeft] = useState<number | null>(null);

  // ⬇️ novo: trava os botões depois que o user clicar em aceitar/recusar
  const [acceptChoiceLocked, setAcceptChoiceLocked] = useState(false);

  const [accepting, setAccepting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const acceptPromptSoundPlayedRef = useRef(false);

  useEffect(() => {
    if (!type) return;

    async function poll() {
      const res = await fetch("/api/queue/status", {
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json: QueueStatus = await res.json();

      // se o backend tirou o pendingAccept, libera o lock (pra caso apareça de novo depois)
      if (!json.pendingAccept) setAcceptChoiceLocked(false);

      if (json.pendingAccept && !acceptPromptSoundPlayedRef.current) {
        acceptPromptSoundPlayedRef.current = true;
        playAcceptPromptSound();
      }

      setData(json);

      // Partida formada: som, notificação e redirecionar
      if (json.matchFound && json.matchId) {
        setMatchFoundAlert(true);
        playMatchFoundSound();
        notifyMatchFound(json.matchId).catch(() => {});
        setTimeout(() => {
          router.replace(`/matches/${json.matchId}`);
        }, 1200);
        return;
      }

      // ✅ DEPOIS valida fila
      if (!json.inQueue || json.currentQueue !== type) {
        router.push("/queue");
        return;
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [type, router]);

  useEffect(() => {
    if (!type) return;
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/queue/waiting/${encodeURIComponent(type)}/messages`, {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setMessages(json.messages ?? []);
        }
      } catch {
        // ignore
      }
    }
    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, [type]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showAcceptModal = data?.pendingAccept && data?.acceptDeadline != null;
  useEffect(() => {
    if (!showAcceptModal || !data?.acceptDeadline) {
      setAcceptSecondsLeft(null);
      return;
    }
    const update = () => {
      const left = Math.max(0, Math.ceil((data.acceptDeadline! - Date.now()) / 1000));
      setAcceptSecondsLeft(left);
    };
    update();
    const t = setInterval(update, 500);
    return () => clearInterval(t);
  }, [showAcceptModal, data?.acceptDeadline]);

  async function handleAccept(accept: boolean) {
    // ⬇️ se já clicou uma vez, trava geral
    if (accepting || acceptChoiceLocked) return;

    // ⬇️ desabilita os 2 botões na hora do clique
    setAcceptChoiceLocked(true);
    setAccepting(true);

    try {
      const res = await fetch("/api/queue/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accept }),
      });

      const json = await res.json().catch(() => ({}));

      if (json.matchFound && json.matchId) {
        playMatchFoundSound();
        notifyMatchFound(json.matchId).catch(() => {});
        router.replace(`/matches/${json.matchId}`);
        return;
      }

      if (res.ok && !accept) {
        router.push("/queue");
        return;
      }

      if (res.ok) {
        setData((d) => (d ? { ...d, pendingAccept: true, acceptDeadline: d.acceptDeadline } : d));
      } else {
        // ⬇️ deu erro -> libera os botões pra tentar de novo
        setAcceptChoiceLocked(false);
      }
    } catch {
      // ⬇️ falha de rede -> libera
      setAcceptChoiceLocked(false);
    } finally {
      setAccepting(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/queue/waiting/${encodeURIComponent(type)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        setChatInput("");
        const list = await fetch(`/api/queue/waiting/${encodeURIComponent(type)}/messages`, {
          credentials: "include",
        }).then((r) => r.json());
        setMessages(list.messages ?? []);
      }
    } finally {
      setSending(false);
    }
  }

  async function leaveQueue() {
    setLeavingQueue(true);
    try {
      const res = await fetch("/api/queue/leave", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        router.push("/queue");
      }
    } finally {
      setLeavingQueue(false);
    }
  }

  const players = data?.queuePlayers ?? [];
  const needed = getPlayersRequired(type);

  const acceptButtonsDisabled = accepting || acceptChoiceLocked;

  return (
    <div className="space-y-8">
      {matchFoundAlert && (
        <div className="rounded-2xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 p-8 text-center clip-card animate-pulse">
          <p className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">Partida formada!</p>
          <p className="mt-3 text-sm text-[var(--hub-text-muted)]">
            Você será levado à tela da partida em instantes. O criador informará o código do Valorant lá.
          </p>
          <p className="mt-4 flex items-center justify-center gap-2 text-[var(--hub-accent)]">
            <Loader2 size={18} className="animate-spin" />
            Redirecionando...
          </p>
        </div>
      )}

      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true">
          <div className="rounded-2xl border-2 border-[var(--hub-accent)] bg-[var(--hub-bg-card)] max-w-md w-full p-6 shadow-xl text-center">
            <p className="text-xl font-black uppercase tracking-tight text-[var(--hub-text)]">Partida formada!</p>
            <p className="mt-2 text-sm text-[var(--hub-text-muted)]">Aceite em até 10 segundos para entrar na partida.</p>
            <p className="mt-4 text-4xl font-mono font-bold text-[var(--hub-accent)]">{acceptSecondsLeft ?? 10}</p>
            <p className="text-xs text-[var(--hub-text-muted)]">segundos restantes</p>

            <div className="mt-6 flex gap-3 justify-center">
              <button
                type="button"
                disabled={acceptButtonsDisabled}
                onClick={() => handleAccept(false)}
                className="rounded-xl border-2 border-red-500/50 px-5 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                {acceptChoiceLocked && !accepting ? "Aguardando..." : "Recusar"}
              </button>

              <button
                type="button"
                disabled={acceptButtonsDisabled}
                onClick={() => handleAccept(true)}
                className="rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-5 py-2.5 text-sm font-bold text-[var(--hub-accent)] hover:bg-[var(--hub-accent)]/30 disabled:opacity-50"
              >
                {accepting ? "..." : acceptChoiceLocked ? "Aguardando..." : "Aceitar"}
              </button>
            </div>

            <p className="mt-4 text-xs text-[var(--hub-text-muted)]">Quem não aceitar será removido da fila.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <Link href="/queue" className="text-sm text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)] transition">
          ← Voltar às filas
        </Link>
        <button
          onClick={leaveQueue}
          disabled={leavingQueue}
          className="text-sm px-4 py-2 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 disabled:opacity-50 font-medium transition"
        >
          {leavingQueue ? "Saindo..." : "Sair da fila"}
        </button>
      </div>

      <div className="pl-6 py-2 border-l-4" style={{ borderColor: QUEUE_COLORS[type] ?? "var(--hub-accent)" }}>
        <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)] flex items-center gap-2">
          <Users size={28} style={{ color: QUEUE_COLORS[type] ?? "var(--hub-accent)" }} />
          Sala de espera — {getQueueDisplayName(type)}
        </h1>
        <p className="mt-2 text-sm text-[var(--hub-text-muted)]">
          {players.length}/{needed} jogadores · Aguardando partida
        </p>
        <p className="mt-1 text-sm text-[var(--hub-text-muted)]">
          Entre no Discord da Hub:{" "}
          <a
            href="https://discord.gg/dTafBSDEXg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--hub-accent)] font-medium underline hover:no-underline"
          >
            discord.gg/dTafBSDEXg
          </a>
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-6 clip-card">
        <div className="h-2 w-full rounded-full bg-[var(--hub-bg)] mb-6">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--hub-accent)] to-[var(--hub-accent-cyan)] transition-all duration-500"
            style={{ width: `${needed > 0 ? Math.min(100, (players.length / needed) * 100) : 0}%` }}
          />
        </div>
        <div className="grid md:grid-cols-5 gap-4">
          {players.map((p) => (
            <div key={p.id} className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]/50 p-4 text-center">
              <p className="text-sm font-medium text-[var(--hub-text)] truncate">{getQueueAliasFromId(p.id)}</p>
            </div>
          ))}
          {Array.from({ length: Math.max(0, needed - players.length) }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-dashed border-[var(--hub-border)] p-4 text-center text-xs text-[var(--hub-text-muted)]"
            >
              Aguardando...
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] clip-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]">
          <MessageCircle size={20} className="text-[var(--hub-accent)]" />
          <h2 className="font-bold text-[var(--hub-text)]">Chat da sala</h2>
          <span className="text-xs text-[var(--hub-text-muted)]">(nomes aleatórios)</span>
        </div>

        <div className="queue-chat max-h-[280px] overflow-y-auto overflow-x-hidden p-4 space-y-2 min-h-[120px]" role="log" aria-live="polite">
          {messages.length === 0 && (
            <p className="text-sm text-[var(--hub-text-muted)]">Nenhuma mensagem ainda. Seja o primeiro a falar.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className="text-sm flex flex-wrap items-baseline gap-1.5">
              <span className="font-semibold shrink-0" style={{ color: m.authorColor ?? "var(--hub-text-muted)" }}>
                {m.authorLabel ?? "Jogador"}:
              </span>
              <span className="text-[var(--hub-text)] break-words">{m.content}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-3 border-t border-[var(--hub-border)] flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value.slice(0, 500))}
            placeholder="Mensagem (anônima)..."
            maxLength={500}
            className="flex-1 min-w-0 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] px-3 py-2 text-sm text-[var(--hub-text)] placeholder:text-[var(--hub-text-muted)]"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !chatInput.trim()}
            className="rounded-lg bg-[var(--hub-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 flex items-center gap-1"
          >
            <Send size={16} />
            {sending ? "..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
