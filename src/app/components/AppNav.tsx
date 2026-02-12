"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useCallback } from "react";

const PUBLIC_LINKS = [
  { href: "/", label: "Início" },
  { href: "/leaderboard", label: "Ranking" },
  { href: "/users", label: "Jogadores" },
  { href: "/tournaments", label: "Torneios" },
  { href: "/missions", label: "Missões" },
  { href: "/parceiros", label: "Parceiros" },
] as const;

const AUTH_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/queue", label: "Fila" },
  { href: "/matches", label: "Partidas" },
  { href: "/friends", label: "Amigos" },
  { href: "/profile/edit", label: "Perfil" },
  { href: "/notifications", label: "Notificações" },
  { href: "/support", label: "Suporte" },
] as const;

const ADMIN_LINKS = [
  { href: "/admin", label: "Admin" },
  { href: "/admin/reports", label: "Reports" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navClass = useCallback(
    (path: string) =>
      pathname === path
        ? "text-[var(--hub-accent)] font-bold"
        : "text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]",
    [pathname]
  );

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--hub-text-muted)]">...</span>
      </div>
    );
  }

  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      onClick={closeMobile}
      className={`block py-2 px-1 text-sm font-medium uppercase tracking-wider transition ${navClass(href)}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      {/* Desktop: nav completo */}
      <nav className="hidden md:flex flex-wrap items-center gap-1 sm:gap-3 text-sm font-medium uppercase tracking-wider">
        {PUBLIC_LINKS.map(({ href, label }) => (
          <NavLink key={href} href={href} label={label} />
        ))}
        {session?.user ? (
          <>
            <span className="hidden lg:inline w-px h-4 bg-[var(--hub-border)] mx-1" aria-hidden />
            {AUTH_LINKS.map(({ href, label }) => (
              <NavLink key={href} href={href} label={label} />
            ))}
            {session.user.isAdmin &&
              ADMIN_LINKS.map(({ href, label }) => (
                <NavLink key={href} href={href} label={label} />
              ))}
            <span className="w-px h-4 bg-[var(--hub-border)] mx-1" aria-hidden />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="py-2 px-1 text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)] transition uppercase tracking-wider"
            >
              Sair
            </button>
          </>
        ) : null}
        {!session?.user && (
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="ml-2 clip-button px-4 py-2 border border-[var(--hub-accent)] text-[var(--hub-accent)] font-bold uppercase tracking-widest hover:bg-[var(--hub-accent)] hover:text-white transition"
          >
            Entrar com Google
          </button>
        )}
      </nav>

      {/* Mobile: botão hamburger */}
      <div className="flex items-center gap-2 md:hidden">
        {!session?.user && (
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="clip-button px-3 py-1.5 border border-[var(--hub-accent)] text-[var(--hub-accent)] text-xs font-bold uppercase tracking-widest"
          >
            Entrar
          </button>
        )}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="p-2 rounded border border-[var(--hub-border)] text-[var(--hub-text)] hover:bg-[var(--hub-bg-card)] transition"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile: overlay do menu */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={closeMobile}
            aria-hidden
          />
          <div
            className="fixed top-0 right-0 z-50 w-full max-w-xs h-full border-l border-[var(--hub-border)] bg-[var(--hub-bg)] shadow-2xl md:hidden overflow-y-auto"
            role="dialog"
            aria-label="Menu de navegação"
          >
            <div className="flex flex-col gap-6 p-6 pt-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--hub-text-muted)]">
                Navegação
              </p>
              <div className="flex flex-col gap-1">
                {PUBLIC_LINKS.map(({ href, label }) => (
                  <NavLink key={href} href={href} label={label} />
                ))}
              </div>
              {session?.user && (
                <>
                  <span className="border-t border-[var(--hub-border)]" />
                  <div className="flex flex-col gap-1">
                    {AUTH_LINKS.map(({ href, label }) => (
                      <NavLink key={href} href={href} label={label} />
                    ))}
                  </div>
                  {session.user.isAdmin && (
                    <div className="flex flex-col gap-1">
                      {ADMIN_LINKS.map(({ href, label }) => (
                        <NavLink key={href} href={href} label={label} />
                      ))}
                    </div>
                  )}
                  <span className="border-t border-[var(--hub-border)]" />
                  <button
                    type="button"
                    onClick={() => {
                      closeMobile();
                      signOut({ callbackUrl: "/" });
                    }}
                    className="text-left py-2 px-1 text-sm font-medium uppercase tracking-wider text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)] transition"
                  >
                    Sair
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
