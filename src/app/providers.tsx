"use client";

import { SessionProvider } from "next-auth/react";
import { PresenceHeartbeat } from "./components/PresenceHeartbeat";
import { ToastProvider } from "./context/ToastContext";
import { Top1Daily } from "./components/Top1Daily";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <PresenceHeartbeat />
        <Top1Daily />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
