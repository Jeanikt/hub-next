"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useCallback } from "react";
import {
  Home,
  Trophy,
  Users,
  Swords,
  Target,
  Building2,
  LayoutDashboard,
  ListOrdered,
  Gamepad2,
  UserPlus,
  User,
  Bell,
  HelpCircle,
  Shield,
  Flag,
  LogOut,
  LogIn,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

const PUBLIC_LINKS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/leaderboard", label: "Ranking", icon: Trophy },
  { href: "/users", label: "Jogadores", icon: Users },
  { href: "/tournaments", label: "Torneios", icon: Swords },
  { href: "/missions", label: "Missões", icon: Target },
  { href: "/parceiros", label: "Parceiros", icon: Building2 },
] as const;

const AUTH_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/queue", label: "Fila", icon: ListOrdered },
  { href: "/matches", label: "Partidas", icon: Gamepad2 },
  { href: "/friends", label: "Amigos", icon: UserPlus },
  { href: "/profile", label: "Perfil", icon: User },
  { href: "/notifications", label: "Notificações", icon: Bell },
  { href: "/support", label: "Suporte", icon: HelpCircle },
] as const;

const ADMIN_LINKS = [
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/admin/reports", label: "Reports", icon: Flag },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = useCallback(
    (path: string) => pathname === path || (path !== "/" && pathname.startsWith(path)),
    [pathname]
  );

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
  }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        onClick={closeMobile}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-[var(--hub-accent)]/15 text-[var(--hub-accent)] border border-[var(--hub-border-accent)]"
            : "text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)] border border-transparent"
        }`}
      >
        <Icon size={20} className="shrink-0" />
        <span>{label}</span>
        {active && <ChevronRight size={16} className="ml-auto opacity-70" />}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--hub-border)] px-4">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-sm rotate-45"
          style={{
            background: "var(--hub-accent)",
            boxShadow: "0 0 14px var(--hub-accent)",
          }}
        />
        <span className="text-sm font-black uppercase tracking-widest text-[var(--hub-text)]">
          {process.env.NEXT_PUBLIC_APP_NAME ?? "HUBEXPRESSO"}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--hub-text-muted)]">
          Público
        </p>
        {PUBLIC_LINKS.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
        ))}

        {session?.user && (
          <>
            <p className="px-3 mt-6 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--hub-text-muted)]">
              Conta
            </p>
            {AUTH_LINKS.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
            ))}
            {(session.user.isSuperAdmin ?? session.user.isAdmin) &&
              ADMIN_LINKS.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
              ))}
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-[var(--hub-border)] p-3">
        {status === "loading" ? (
          <div className="h-10 rounded-lg bg-[var(--hub-bg-elevated)] animate-pulse" />
        ) : session?.user ? (
          <button
            type="button"
            onClick={() => {
              closeMobile();
              signOut({ callbackUrl: "/" });
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-accent)] transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              closeMobile();
              signIn("google", { callbackUrl: "/dashboard" });
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--hub-accent)] border border-[var(--hub-accent)]/40 hover:bg-[var(--hub-accent)]/10 transition-colors"
          >
            <LogIn size={20} />
            <span>Entrar com Google</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: botão para abrir */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-30 flex md:hidden h-10 w-10 items-center justify-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-card)] text-[var(--hub-text)] shadow-lg"
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {/* Desktop: sidebar fixa */}
      <aside
        className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-r border-[var(--hub-border)] bg-[var(--hub-bg-card)] md:flex"
        aria-label="Navegação principal"
      >
        <SidebarContent />
      </aside>

      {/* Mobile: overlay + drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={closeMobile}
            aria-hidden
          />
          <aside
            className="fixed left-0 top-0 z-50 h-full w-72 max-w-[85vw] border-r border-[var(--hub-border)] bg-[var(--hub-bg-card)] shadow-2xl md:hidden"
            role="dialog"
            aria-label="Menu"
          >
            <div className="flex h-16 items-center justify-end border-b border-[var(--hub-border)] px-4">
              <button
                type="button"
                onClick={closeMobile}
                className="p-2 rounded-lg text-[var(--hub-text-muted)] hover:bg-[var(--hub-bg-elevated)] hover:text-[var(--hub-text)]"
                aria-label="Fechar menu"
              >
                <X size={22} />
              </button>
            </div>
            <div className="h-[calc(100%-4rem)] overflow-y-auto">
              <SidebarContent />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
