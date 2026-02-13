import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { isAllowedAdmin } from "@/src/lib/admin";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ListOrdered,
  MessageSquare,
  Flag,
  Settings,
  Gamepad2,
  Target,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!isAllowedAdmin(session)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--hub-border)] pb-4">
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
        >
          <LayoutDashboard size={18} />
          Dashboard
        </Link>
        <Link
          href="/admin/users"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
        >
          <Users size={18} />
          Usuários
        </Link>
        <Link
          href="/admin/queues"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
        >
          <ListOrdered size={18} />
          Filas
        </Link>
        <Link
          href="/admin/matches"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
        >
          <Gamepad2 size={18} />
          Partidas
        </Link>
        <Link
          href="/admin/tickets"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
        >
          <MessageSquare size={18} />
          Tickets
        </Link>
        <Link
          href="/admin/reports"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
        >
          <Flag size={18} />
          Reports
        </Link>
        <Link
          href="/admin/missions"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
        >
          <Target size={18} />
          Missões
        </Link>
        <Link
          href="/admin/settings"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
        >
          <Settings size={18} />
          Configurações
        </Link>
      </div>
      {children}
    </div>
  );
}
