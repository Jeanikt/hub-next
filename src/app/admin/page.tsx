"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Gamepad2,
  ShieldOff,
  ListOrdered,
  MessageSquare,
  ChevronRight,
  Settings,
  Target,
} from "lucide-react";

type Stats = {
  users_total: number;
  users_online: number;
  matches_today: number;
  banned_total: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d.stats ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--hub-text-muted)]">
        <div className="hub-loading-spinner h-6 w-6 border-2" />
        Carregando...
      </div>
    );
  }

  if (!stats) {
    return (
      <p className="text-[var(--hub-accent-red)]">Sem permissão ou erro ao carregar.</p>
    );
  }

  const cards = [
    {
      label: "Total de usuários",
      value: stats.users_total,
      icon: Users,
      href: "/admin/users",
      color: "text-[var(--hub-text)]",
    },
    {
      label: "Online agora",
      value: stats.users_online,
      icon: UserCheck,
      color: "text-[var(--hub-accent)]",
    },
    {
      label: "Partidas hoje",
      value: stats.matches_today,
      icon: Gamepad2,
      color: "text-[var(--hub-text)]",
    },
    {
      label: "Banidos",
      value: stats.banned_total,
      icon: ShieldOff,
      color: "text-[var(--hub-accent-red)]",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--hub-text)]">
        Dashboard admin
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--hub-text-muted)]">
                  {c.label}
                </p>
                <p className={`mt-1 text-2xl font-black ${c.color}`}>{c.value}</p>
              </div>
              <c.icon size={28} className="text-[var(--hub-text-muted)]" />
            </div>
            {c.href && (
              <Link
                href={c.href}
                className="mt-3 flex items-center gap-1 text-sm font-medium text-[var(--hub-accent)] hover:underline"
              >
                Ver todos <ChevronRight size={16} />
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/queues"
          className="flex items-center justify-between rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 transition hover:border-[var(--hub-accent)]/40"
        >
          <div className="flex items-center gap-3">
            <ListOrdered size={24} className="text-[var(--hub-accent)]" />
            <div>
              <p className="font-bold text-[var(--hub-text)]">Filas</p>
              <p className="text-sm text-[var(--hub-text-muted)]">Jogadores em fila</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-[var(--hub-text-muted)]" />
        </Link>
        <Link
          href="/admin/tickets"
          className="flex items-center justify-between rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 transition hover:border-[var(--hub-accent)]/40"
        >
          <div className="flex items-center gap-3">
            <MessageSquare size={24} className="text-[var(--hub-accent)]" />
            <div>
              <p className="font-bold text-[var(--hub-text)]">Tickets</p>
              <p className="text-sm text-[var(--hub-text-muted)]">Suporte</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-[var(--hub-text-muted)]" />
        </Link>
        <Link
          href="/admin/missions"
          className="flex items-center justify-between rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 transition hover:border-[var(--hub-accent)]/40"
        >
          <div className="flex items-center gap-3">
            <Target size={24} className="text-[var(--hub-accent)]" />
            <div>
              <p className="font-bold text-[var(--hub-text)]">Missões</p>
              <p className="text-sm text-[var(--hub-text-muted)]">Ativar/desativar</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-[var(--hub-text-muted)]" />
        </Link>
        <Link
          href="/admin/settings"
          className="flex items-center justify-between rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-card)] p-5 transition hover:border-[var(--hub-accent)]/40"
        >
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-[var(--hub-accent)]" />
            <div>
              <p className="font-bold text-[var(--hub-text)]">Configurações</p>
              <p className="text-sm text-[var(--hub-text-muted)]">Filas, partidas, ELO</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-[var(--hub-text-muted)]" />
        </Link>
      </div>
    </div>
  );
}
