"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  MapPin,
  Heart,
  Loader2,
  Trash2,
  AlertTriangle,
  Send,
  GripVertical,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

type RoadmapItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  likesCount: number;
  myLike: boolean;
  authorId?: string;
  authorUsername?: string | null;
  authorName?: string | null;
};

const COLUMNS: { id: string; label: string }[] = [
  { id: "suggestion", label: "Sugestão" },
  { id: "priority", label: "Prioridade" },
  { id: "development", label: "Desenvolvimento" },
  { id: "done", label: "Concluído" },
];

export default function RoadmapPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const fetchedForUser = useRef<string | null>(null);

  const fetchRoadmap = useCallback(async () => {
    setLoading(true);
    try {
      const adminParam = session?.user ? "?admin=1" : "";
      const res = await fetch(`/api/roadmap${adminParam}`, { credentials: "include" });
      const data = await res.json();
      if (data.items) setItems(data.items);
      if (res.ok && data.isAdmin !== undefined) setIsAdmin(data.isAdmin === true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (userId === fetchedForUser.current) return;
    fetchedForUser.current = userId;
    fetchRoadmap();
  }, [session?.user?.id, fetchRoadmap]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user || !title.trim()) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.message ?? "Erro ao enviar.");
        return;
      }
      setItems((prev) => [data, ...prev]);
      setTitle("");
      setDescription("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(itemId: string) {
    if (!session?.user) return;
    try {
      const res = await fetch(`/api/roadmap/${itemId}/like`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId
              ? { ...it, likesCount: data.likesCount, myLike: data.liked }
              : it
          )
        );
      }
    } catch {
      // ignore
    }
  }

  async function handleMove(itemId: string, newStatus: string) {
    if (!isAdmin) return;
    setMovingId(itemId);
    try {
      const res = await fetch(`/api/roadmap/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, status: newStatus } : it))
        );
      }
    } finally {
      setMovingId(null);
    }
  }

  async function handleDelete(itemId: string) {
    if (!isAdmin) return;
    if (!confirm("Remover esta sugestão do roadmap?")) return;
    try {
      const res = await fetch(`/api/roadmap/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setItems((prev) => prev.filter((it) => it.id !== itemId));
    } catch {
      // ignore
    }
  }

  function onDragStart(e: React.DragEvent, item: RoadmapItem) {
    if (!isAdmin) return;
    setDraggedId(item.id);
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, status: string) {
    if (!isAdmin || !draggedId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault();
    if (!isAdmin || !draggedId) return;
    const item = items.find((i) => i.id === draggedId);
    if (item && item.status !== newStatus) handleMove(draggedId, newStatus);
    setDraggedId(null);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--hub-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="border-l-4 border-[var(--hub-accent)] pl-6 py-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[var(--hub-text)] flex items-center gap-2">
            <MapPin size={28} />
            Roadmap
          </h1>
          <p className="text-sm text-[var(--hub-text-muted)] mt-1">
            Sugira features, correções e melhorias. A comunidade curte; o admin organiza e prioriza.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchRoadmap()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-3 py-2 text-sm font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] hover:bg-[var(--hub-bg-elevated)] disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </header>

      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 flex gap-3">
        <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
        <div className="text-sm text-[var(--hub-text)]">
          <p className="font-semibold text-amber-500">Aviso importante</p>
          <p className="mt-1 text-[var(--hub-text-muted)]">
            Conteúdo ofensivo, spam ou inapropriado nas sugestões resulta em <strong>banimento</strong> da conta.
            Seja respeitoso e objetivo.
          </p>
        </div>
      </div>

      {session?.user && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-4 space-y-3">
          <h2 className="text-sm font-bold text-[var(--hub-text)]">Nova sugestão</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (ex.: Dark mode no perfil)"
            className="w-full px-4 py-2.5 bg-black/30 border border-[var(--hub-border)] rounded-lg text-white placeholder-[var(--hub-text-muted)] focus:border-[var(--hub-accent)] focus:outline-none"
            maxLength={200}
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional"
            className="w-full px-4 py-2.5 bg-black/30 border border-[var(--hub-border)] rounded-lg text-white placeholder-[var(--hub-text-muted)] focus:border-[var(--hub-accent)] focus:outline-none resize-y min-h-[80px]"
            maxLength={2000}
          />
          {submitError && (
            <p className="text-sm text-red-400">{submitError}</p>
          )}
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--hub-accent)]/20 border border-[var(--hub-accent)] text-[var(--hub-accent)] font-medium hover:bg-[var(--hub-accent)]/30 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Enviar sugestão
          </button>
        </form>
      )}

      {!session?.user && (
        <p className="text-sm text-[var(--hub-text-muted)]">
          <Link href="/login" className="text-[var(--hub-accent)] hover:underline">
            Faça login
          </Link>{" "}
          para enviar sugestões e curtir.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] overflow-hidden flex flex-col min-h-[320px]"
            onDragOver={(e) => onDragOver(e, col.id)}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <div className="px-4 py-3 border-b border-[var(--hub-border)] bg-[var(--hub-bg-elevated)]">
              <h3 className="text-sm font-bold text-[var(--hub-text)]">{col.label}</h3>
              <p className="text-xs text-[var(--hub-text-muted)]">
                {items.filter((i) => i.status === col.id).length} item(ns)
              </p>
            </div>
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {items
                .filter((i) => i.status === col.id)
                .map((item) => (
                  <div
                    key={item.id}
                    draggable={isAdmin}
                    onDragStart={(e) => onDragStart(e, item)}
                    className={`rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)]/80 p-3 transition-shadow ${draggedId === item.id ? "opacity-60" : ""} ${isAdmin ? "cursor-grab active:cursor-grabbing" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      {isAdmin && (
                        <span className="shrink-0 text-[var(--hub-text-muted)]" aria-hidden>
                          <GripVertical size={16} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--hub-text)] text-sm leading-tight">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="mt-1 text-xs text-[var(--hub-text-muted)] line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        {isAdmin && (item.authorUsername ?? item.authorName) && (
                          <p className="mt-1.5 text-[10px] text-[var(--hub-text-muted)]">
                            Por: {item.authorUsername ?? item.authorName ?? item.authorId}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleLike(item.id)}
                            disabled={!session?.user}
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                              item.myLike
                                ? "text-red-400 bg-red-500/10"
                                : "text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)]"
                            }`}
                          >
                            <Heart size={14} fill={item.myLike ? "currentColor" : "none"} />
                            {item.likesCount}
                          </button>
                          {isAdmin && (
                            <>
                              <span className="text-[var(--hub-border)]">|</span>
                              {COLUMNS.filter((c) => c.id !== item.status).map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  disabled={movingId === item.id}
                                  onClick={() => handleMove(item.id, c.id)}
                                  className="text-[10px] text-[var(--hub-accent)] hover:underline disabled:opacity-50"
                                >
                                  → {c.label}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="ml-auto p-1 text-[var(--hub-text-muted)] hover:text-red-400"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {movingId === item.id && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-[var(--hub-accent)]">
                        <Loader2 size={12} className="animate-spin" />
                        Movendo...
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
