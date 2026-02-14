"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";
import { getQueueAliasFromId } from "@/src/lib/valorant";
import { getQueueDisplayName, getPlayersRequired } from "@/src/lib/queues";

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

type ChatMessage = { content: string; createdAt: string };

export default function WaitingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const type = (params?.type as string) ?? "";

  const [data, setData] = useState<QueueStatus | null>(null);
  const [matchFoundAlert, setMatchFoundAlert] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
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

      // Partida formada: avisar e redirecionar todos para a tela da partida
      if (json.matchFound && json.matchId) {
        setMatchFoundAlert(true);
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

  const players = data?.queuePlayers ?? [];
  const needed = getPlayersRequired(type);

  return (
    <div className="space-y-6">
      {matchFoundAlert && (
        <div className="rounded-xl border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 p-6 text-center">
          <p className="text-lg font-bold text-[var(--hub-text)]">Partida formada!</p>
          <p className="mt-2 text-sm text-[var(--hub-text-muted)]">Você será levado à tela da partida em instantes. Lá o criador informará o código do Valorant para todos entrarem.</p>
          <p className="mt-3 text-xs text-[var(--hub-accent)]">Redirecionando...</p>
        </div>
      )}

      <Link href="/queue" className="text-sm underline">
        Voltar
      </Link>

      <h1 className="text-2xl font-bold">
        Sala de espera — {getQueueDisplayName(type)}
      </h1>

      <p>
        {players.length}/{needed} jogadores
      </p>

      <div className="grid md:grid-cols-5 gap-3">
        {players.map((p) => (
          <div
            key={p.id}
            className="border border-[var(--hub-border)] p-3 rounded"
          >
            {getQueueAliasFromId(p.id)}
          </div>
        ))}

        {Array.from({ length: Math.max(0, needed - players.length) }).map(
          (_, i) => (
            <div
              key={i}
              className="border border-dashed border-[var(--hub-border)] p-3 rounded text-center text-xs"
            >
              Aguardando...
            </div>
          )
        )}
      </div>

      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] clip-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]">
          <MessageCircle size={20} className="text-[var(--hub-accent)]" />
          <h2 className="font-bold text-[var(--hub-text)]">Chat da sala</h2>
          <span className="text-xs text-[var(--hub-text-muted)]">(todos anônimos)</span>
        </div>
        <div className="max-h-[280px] overflow-y-auto p-4 space-y-2 min-h-[120px]" role="log" aria-live="polite">
          {messages.length === 0 && (
            <p className="text-sm text-[var(--hub-text-muted)]">Nenhuma mensagem ainda. Seja o primeiro a falar.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className="text-sm">
              <span className="text-[var(--hub-text-muted)]">Jogador:</span>{" "}
              <span className="text-[var(--hub-text)]">{m.content}</span>
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
