import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import { Sidebar } from "./components/Sidebar";
import { ChatWidget } from "./components/ChatWidget";
import { MissionBadge } from "./components/MissionBadge";
import { ReferralAttribute } from "./components/ReferralAttribute";
import { JsonLdOrganization, JsonLdWebSite } from "./components/JsonLd";
import { GoogleAnalytics } from "./components/GoogleAnalytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "HUBEXPRESSO";
const defaultDescription =
  "Hub de players para Valorant – Matchmaking, partidas competitivas, ranking por ELO, filas por nível e integração com conta Riot. Entre na comunidade.";
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dev.hubexpresso.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${siteName} – Hub de players Valorant | Matchmaking e partidas`,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: [
    "Valorant",
    "matchmaking",
    "partidas competitivas",
    "ranking ELO",
    "hub players",
    "fila ranqueada",
    "Riot Games",
    "comunidade Valorant",
  ],
  authors: [{ name: siteName, url: baseUrl }],
  creator: siteName,
  publisher: siteName,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: baseUrl,
    siteName,
    title: `${siteName} – Hub de players Valorant`,
    description: defaultDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} – Hub de players Valorant`,
    description: defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  alternates: { canonical: baseUrl },
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
        <JsonLdOrganization />
        <JsonLdWebSite />
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
            <ReferralAttribute />
            <ChatWidget />
            <main className="relative z-10 min-h-screen pt-14 md:pt-0 md:pl-64">
              <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">{children}</div>
            </main>
          </Providers>
        </div>
        <GoogleAnalytics />
        <Analytics />
      </body>
    </html>
  );
}
