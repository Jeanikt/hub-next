"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

export function UsersCountBadge() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/users/count")
      .then((r) => r.json())
      .then((d) => setTotal(typeof d.total === "number" ? d.total : null))
      .catch(() => setTotal(null));
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hub-border)] bg-[var(--hub-bg-card)] px-3 py-1 text-sm font-medium text-[var(--hub-text-muted)]">
      <Users size={16} className="text-[var(--hub-accent)]" />
      {total !== null ? total.toLocaleString("pt-BR") : "—"} no sistema
    </span>
  );
}
