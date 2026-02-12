import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Sidebar } from "./components/Sidebar";
import { ChatWidget } from "./components/ChatWidget";
import { MissionBadge } from "./components/MissionBadge";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HUBEXPRESSO",
  description: "Hub de players para Valorant – Matchmaking e partidas competitivas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "var(--hub-bg)", color: "var(--hub-text)" }}
      >
        <div className="min-h-screen relative overflow-x-hidden">
          <div className="fixed inset-0 z-0 hub-noise" aria-hidden />
          <div
            className="fixed top-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.04] pointer-events-none z-0"
            style={{ background: "var(--hub-accent)", filter: "blur(120px)" }}
            aria-hidden
          />
          <div
            className="fixed bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-[0.03] pointer-events-none z-0"
            style={{ background: "var(--hub-accent-cyan)", filter: "blur(100px)" }}
            aria-hidden
          />

          <Providers>
            <Sidebar />
            <MissionBadge />
            <ChatWidget />
            <main className="relative z-10 min-h-screen pt-14 md:pt-0 md:pl-64">
              <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">{children}</div>
            </main>
          </Providers>
        </div>
      </body>
    </html>
  );
}
