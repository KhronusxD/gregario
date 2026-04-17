"use client";

import { useEffect, useState } from "react";

type StatusPayload = {
  ok: boolean;
  state: "open" | "connecting" | "close" | "unknown" | "expired";
  number: string | null;
  qr: { base64: string | null; pairingCode: string | null } | null;
  message?: string;
};

const LABEL: Record<StatusPayload["state"], string> = {
  open: "Conectado",
  connecting: "Conectando",
  close: "Aguardando leitura",
  unknown: "Carregando",
  expired: "Link expirado",
};

export function ConnectClient({ token }: { token: string }) {
  const [status, setStatus] = useState<StatusPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/connect/${token}/status`, { cache: "no-store" });
        const j = (await r.json()) as StatusPayload;
        if (!cancelled) setStatus(j);
      } catch {
        // ignore transient errors; próximo tick tenta de novo
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  if (!status) {
    return <p className="font-sans text-sm text-forest-green/60">Carregando...</p>;
  }

  if (status.state === "expired") {
    return (
      <p className="rounded-lg bg-red-500/10 p-4 font-sans text-sm text-red-600">
        Este link expirou. Peça um novo ao administrador.
      </p>
    );
  }

  if (status.state === "open") {
    return (
      <div className="rounded-lg bg-action-green/10 p-6 text-center">
        <p className="font-display text-base font-bold text-action-green">Conectado!</p>
        {status.number ? (
          <p className="mt-1 font-mono text-sm text-forest-green">+{status.number}</p>
        ) : null}
        <p className="mt-3 font-sans text-xs text-forest-green/60">
          Pode fechar esta janela. Tudo pronto.
        </p>
      </div>
    );
  }

  const qr = status.qr;
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="rounded-full bg-forest-green/10 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green">
        {LABEL[status.state]}
      </span>
      {qr?.base64 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr.base64} alt="QR Code" className="h-64 w-64 rounded-sm bg-white p-2" />
      ) : (
        <p className="font-sans text-sm text-forest-green/60">Gerando QR...</p>
      )}
      {qr?.pairingCode ? (
        <p className="font-sans text-xs text-forest-green/70">
          Código de pareamento: <span className="font-mono font-bold">{qr.pairingCode}</span>
        </p>
      ) : null}
    </div>
  );
}
