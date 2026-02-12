"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navClass = (path: string, current: string) =>
  current === path
    ? "text-[var(--hub-accent)] font-bold"
    : "text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]";

export function HubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--hub-bg)] text-[var(--hub-text)] relative overflow-x-hidden">
      {/* Background estilo Valorant (paridade Laravel) */}
      <div className="fixed inset-0 z-0 hub-noise" aria-hidden />
      <div
        className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.06] pointer-events-none z-0"
        style={{ background: "var(--hub-accent)", filter: "blur(150px)" }}
        aria-hidden
      />
      <div
        className="fixed bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.05] pointer-events-none z-0"
        style={{ background: "#3b82f6", filter: "blur(150px)" }}
        aria-hidden
      />

      <header className="relative z-10 border-b border-[var(--hub-border)] bg-[var(--hub-bg)]/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="h-2 w-2 rotate-45"
              style={{ background: "var(--hub-accent)", boxShadow: "0 0 12px var(--hub-accent)" }}
            />
            <span className="text-sm font-black uppercase tracking-widest text-[var(--hub-text)]">
              {process.env.NEXT_PUBLIC_APP_NAME ?? "HUBEXPRESSO"}
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium uppercase tracking-wider">
            <Link href="/" className={navClass("/", pathname)}>Início</Link>
            <Link href="/dashboard" className={navClass("/dashboard", pathname)}>Dashboard</Link>
            <Link href="/queue" className={navClass("/queue", pathname)}>Fila</Link>
            <Link href="/matches" className={navClass("/matches", pathname)}>Partidas</Link>
            <Link href="/friends" className={navClass("/friends", pathname)}>Amigos</Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[var(--hub-text-muted)] hover:text-[var(--hub-accent)]"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
