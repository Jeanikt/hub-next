"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Target } from "lucide-react";

export function MissionBadge() {
  const { data: session, status } = useSession();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    fetch("/api/missions", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const list = d.data ?? [];
        const available = list.filter((m: { completed?: boolean }) => !m.completed).length;
        setCount(available);
      })
      .catch(() => setCount(0));
  }, [status, session?.user]);

  if (status !== "authenticated" || count === null || count === 0) return null;

  return (
    <Link
      href="/missions"
      className="hub-animate-fade-in fixed top-20 right-6 z-30 flex items-center gap-2 rounded-xl border border-[var(--hub-accent)]/40 bg-[var(--hub-bg-card)] px-3 py-2 text-sm font-medium text-[var(--hub-accent)] shadow-lg transition-all hover:scale-105 hover:border-[var(--hub-accent)] md:top-6 md:right-6"
    >
      <Target size={18} />
      <span>{count} missõ{count === 1 ? "ão" : "es"} disponíve{count === 1 ? "l" : "is"}</span>
    </Link>
  );
}
