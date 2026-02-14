"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getQueueAliasFromId } from "@/src/lib/valorant";

type QueuePlayer = {
  id: string;
  username: string | null;
  elo: number | null;
  level: number | null;
};

type QueueStatus = {
  inQueue: boolean;
  currentQueue: string | null;
  queuePlayers: QueuePlayer[];
  matchFound?: boolean;
  matchId?: string | null;
};

export default function WaitingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const type = (params?.type as string) ?? "";

  const [data, setData] = useState<QueueStatus | null>(null);
  const [matchFoundAlert, setMatchFoundAlert] = useState(false);

  useEffect(() => {
    if (!type) return;

    async function poll() {
      const res = await fetch("/api/queue/status", {
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json: QueueStatus = await res.json();
      setData(json);

      // ✅ PRIMEIRO verifica se encontrou partida
      if (json.matchFound && json.matchId) {
        setMatchFoundAlert(true);
        setTimeout(() => {
          router.push(`/matches/${json.matchId}`);
        }, 800);
        return;
      }

      // ✅ DEPOIS valida fila
      if (!json.inQueue || json.currentQueue !== type) {
        router.push("/queue");
        return;
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [type, router]);

  const players = data?.queuePlayers ?? [];
  const needed = type === "secret" ? 2 : 10;

  return (
    <div className="space-y-6">
      {matchFoundAlert && (
        <div className="border border-green-500/40 p-4 rounded text-center">
          Partida encontrada! Redirecionando...
        </div>
      )}

      <Link href="/queue" className="text-sm underline">
        Voltar
      </Link>

      <h1 className="text-2xl font-bold">
        Sala de espera — {type.replace("_", " ")}
      </h1>

      <p>
        {players.length}/{needed} jogadores
      </p>

      <div className="grid md:grid-cols-5 gap-3">
        {players.map((p) => (
          <div
            key={p.id}
            className="border border-[var(--hub-border)] p-3 rounded"
          >
            {getQueueAliasFromId(p.id)}
          </div>
        ))}

        {Array.from({ length: Math.max(0, needed - players.length) }).map(
          (_, i) => (
            <div
              key={i}
              className="border border-dashed border-[var(--hub-border)] p-3 rounded text-center text-xs"
            >
              Aguardando...
            </div>
          )
        )}
      </div>
    </div>
  );
}
