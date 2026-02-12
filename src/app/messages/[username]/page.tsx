"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Send, ArrowLeft } from "lucide-react";

type Message = {
  id: number;
  content: string;
  senderId: string;
  receiverId: string;
  sender: { id: string; username: string | null };
  receiver: { id: string; username: string | null };
  readAt: string | null;
  createdAt: string;
};

type Peer = {
  id: string;
  username: string | null;
  name: string | null;
  isOnline?: boolean;
};

const POLL_INTERVAL_MS = 3500;

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const username = (params?.username as string) ?? "";
  const [messages, setMessages] = useState<Message[]>([]);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(() => {
    if (!username) return;
    return fetch(`/api/friend-messages?username=${encodeURIComponent(username)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setMessages(d.messages ?? []);
        if (d.peer) setPeer(d.peer);
      })
      .catch(() => {});
  }, [username, router]);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetchMessages()?.finally(() => setLoading(false));
  }, [username, fetchMessages]);

  useEffect(() => {
    if (!username || loading) return;
    const t = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [username, loading, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const peerId = peer?.id;
    if (!content.trim() || !peerId) return;
    setSending(true);
    try {
      const res = await fetch("/api/friend-messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiver_id: peerId,
          content: content.trim(),
        }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: json.id,
            content: json.content,
            senderId: json.senderId,
            receiverId: json.receiverId,
            sender: { id: json.senderId, username: null },
            receiver: { id: json.receiverId, username: null },
            readAt: null,
            createdAt: json.createdAt,
          },
        ]);
        setContent("");
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] clip-card">
        <div className="text-center">
          <div className="hub-loading-spinner mx-auto mb-4" />
          <p className="text-sm font-medium text-[var(--hub-text-muted)]">Carregando conversa...</p>
        </div>
      </div>
    );
  }

  const peerId = peer?.id ?? null;
  const isMyMessage = (m: Message) => peerId != null && m.senderId !== peerId;
  const displayName = (peer?.name ?? peer?.username ?? username) || "—";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/friends"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)] transition-colors"
      >
        <ArrowLeft size={16} />
        Amigos
      </Link>

      <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] clip-card overflow-hidden flex flex-col" style={{ minHeight: "420px" }}>
        {/* Header do chat com status online */}
        <div className="flex items-center gap-3 border-b border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]/50 px-4 py-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--hub-accent)]/20 text-[var(--hub-accent)] font-bold uppercase">
            {displayName[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold uppercase tracking-tight text-[var(--hub-text)]">
              {displayName}
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-[var(--hub-text-muted)]">
              {peer?.isOnline ? (
                <>
                  <Circle size={6} className="fill-[var(--hub-accent)] text-[var(--hub-accent)]" />
                  Online
                </>
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>

        {/* Área de mensagens */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px]">
          {messages.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-[var(--hub-text-muted)]">
              Nenhuma mensagem ainda. Envie a primeira!
            </div>
          ) : (
            messages.map((m) => {
              const mine = isMyMessage(m);
              const time = new Date(m.createdAt);
              const timeStr = time.toLocaleDateString("pt-BR") === new Date().toLocaleDateString("pt-BR")
                ? time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                : time.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      mine
                        ? "rounded-br-md bg-[var(--hub-accent)] text-white"
                        : "rounded-bl-md bg-[var(--hub-bg-elevated)] text-[var(--hub-text)] border border-[var(--hub-border)]"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`mt-1 text-xs ${mine ? "text-white/80" : "text-[var(--hub-text-muted)]"}`}>
                      {timeStr}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={send} className="flex gap-2 border-t border-[var(--hub-border)] bg-[var(--hub-bg)] p-3">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-4 py-2.5 text-sm text-[var(--hub-text)] placeholder:text-[var(--hub-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)]/50 focus:border-[var(--hub-accent)]/50 transition-all"
          />
          <button
            type="submit"
            disabled={sending || !content.trim() || !peerId}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--hub-accent)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            title="Enviar"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
