"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { MessageCircle, Send, Users, Loader2 } from "lucide-react";
import { getQueueAliasFromId } from "@/src/lib/valorant";
import { getQueueDisplayName, getPlayersRequired, QUEUE_COLORS } from "@/src/lib/queues";
import { playMatchFoundSound, notifyMatchFound } from "@/src/lib/useNotificationSound";

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
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    const interval = setInterval(fetchMessages, 1000);
    return () => clearInterval(interval);
  }, [type]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="space-y-8">
      {matchFoundAlert && (
        <div className="rounded-2xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 p-8 text-center clip-card animate-pulse">
          <p className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">Partida formada!</p>
          <p className="mt-3 text-sm text-[var(--hub-text-muted)]">Você será levado à tela da partida em instantes. O criador informará o código do Valorant lá.</p>
          <p className="mt-4 flex items-center justify-center gap-2 text-[var(--hub-accent)]">
            <Loader2 size={18} className="animate-spin" />
            Redirecionando...
          </p>
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
            <div
              key={p.id}
              className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]/50 p-4 text-center"
            >
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
