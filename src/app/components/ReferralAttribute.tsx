"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/** Chama POST /api/referrals/attribute uma vez após login (para atribuir o usuário ao código de convite do cookie). */
export function ReferralAttribute() {
  const { status } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || done.current) return;
    done.current = true;
    fetch("/api/referrals/attribute", { method: "POST", credentials: "include" }).catch(() => {});
  }, [status]);

  return null;
}
