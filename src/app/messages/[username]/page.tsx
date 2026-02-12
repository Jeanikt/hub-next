"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  sender: { id: number; username: string | null };
  receiver: { id: number; username: string | null };
  createdAt: string;
};

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const username = (params?.username as string) ?? "";
  const [messages, setMessages] = useState<Message[]>([]);
  const [peerId, setPeerId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/friend-messages?username=${encodeURIComponent(username)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (r.status === 401) router.push("/login");
        return r.json();
      })
      .then((d) => {
        setMessages(d.messages ?? []);
        setPeerId(d.peer?.id ?? null);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || peerId == null) return;
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
      <div className="flex min-h-[30vh] items-center justify-center rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)]">
        <div className="hub-loading-spinner" />
      </div>
    );
  }

  const isMyMessage = (m: Message) => peerId != null && m.senderId !== peerId;

  return (
    <div className="space-y-6">
      <Link href="/friends" className="text-sm text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)]">
        ← Amigos
      </Link>
      <div className="border-l-4 border-[var(--hub-accent)] pl-6 py-2">
        <h1 className="text-xl font-black uppercase tracking-tight text-[var(--hub-text)]">
          Conversa com {username || "—"}
        </h1>
      </div>

      <div className="flex h-[400px] flex-col rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] clip-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${isMyMessage(m) ? "justify-end" : ""}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  isMyMessage(m)
                    ? "bg-[var(--hub-accent)]/30 text-[var(--hub-text)]"
                    : "bg-[var(--hub-bg-elevated)] text-[var(--hub-text)]"
                }`}
              >
                {m.content}
                <p className="mt-1 text-xs opacity-70">
                  {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-[var(--hub-border)] p-3">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Mensagem..."
            className="flex-1 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] px-3 py-2 text-sm text-[var(--hub-text)] placeholder:text-[var(--hub-text-muted)] clip-button"
          />
          <button
            type="submit"
            disabled={sending || !content.trim() || peerId == null}
            className="rounded-lg border-2 border-[var(--hub-accent)] bg-[var(--hub-accent)]/20 px-4 py-2 text-sm font-bold uppercase tracking-wider text-[var(--hub-accent)] hover:bg-[var(--hub-accent)] hover:text-white disabled:opacity-50 clip-button"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
