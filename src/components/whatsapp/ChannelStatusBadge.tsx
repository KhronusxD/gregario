"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getChannelStatusAction, type ChannelStatus } from "@/actions/whatsapp-channel";

const LABEL: Record<ChannelStatus["state"], { label: string; cls: string }> = {
  open: { label: "Conectado", cls: "bg-action-green text-card" },
  connecting: { label: "Conectando", cls: "bg-yellow-400/20 text-yellow-700" },
  close: { label: "Desconectado", cls: "bg-red-500/15 text-red-600" },
  unknown: { label: "Indefinido", cls: "bg-forest-green/10 text-forest-green/60" },
  none: { label: "Sem canal", cls: "bg-forest-green/10 text-forest-green/50" },
};

export function ChannelStatusBadge() {
  const [status, setStatus] = useState<ChannelStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const s = await getChannelStatusAction().catch(() => null);
      if (!cancelled && s) setStatus(s);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const state = status?.state ?? "unknown";
  const badge = LABEL[state];

  return (
    <Link
      href="/dashboard/settings/whatsapp"
      className="flex items-center gap-3 rounded-full bg-forest-green/5 px-3 py-1.5 hover:bg-forest-green/10"
    >
      <span className={`rounded-full px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest ${badge.cls}`}>
        {badge.label}
      </span>
      {status?.number ? (
        <span className="font-mono text-xs font-bold text-forest-green">+{status.number}</span>
      ) : (
        <span className="font-sans text-xs text-forest-green/60">gerenciar canal →</span>
      )}
    </Link>
  );
}
