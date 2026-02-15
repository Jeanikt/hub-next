"use client";

import { useState, useEffect } from "react";

const DISCORD_URL = "https://discord.gg/dTafBSDEXg";
const STORAGE_KEY = "hub_discord_banner_seen";

export function DiscordBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined" || sessionStorage.getItem(STORAGE_KEY) === "1") return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="relative z-[100] border-b border-[var(--hub-border)] bg-[var(--hub-bg-elevated)] px-4 py-2.5 text-center text-sm text-[var(--hub-text)]"
      role="banner"
    >
      <span className="mr-2">Entre no nosso servidor Discord:</span>
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-[var(--hub-accent)] underline hover:no-underline"
      >
        {DISCORD_URL}
      </a>
      <button
        type="button"
        onClick={dismiss}
        className="ml-3 rounded px-2 py-0.5 text-xs text-[var(--hub-text-muted)] hover:bg-[var(--hub-border)]"
        aria-label="Fechar aviso"
      >
        ✕
      </button>
    </div>
  );
}
