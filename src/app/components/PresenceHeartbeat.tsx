"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 min

/**
 * Envia heartbeat periódico e ao ganhar foco da aba para manter isOnline/lastLoginAt atualizados.
 */
export function PresenceHeartbeat() {
  const { status } = useSession();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendHeartbeat = () => {
    if (status !== "authenticated") return;
    fetch("/api/presence/heartbeat", { credentials: "include" }).catch(() => {});
  };

  useEffect(() => {
    if (status !== "authenticated") return;

    sendHeartbeat();

    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status]);

  return null;
}
