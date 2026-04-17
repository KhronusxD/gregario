"use client";

import { useEffect, useState } from "react";
import { completeWhatsappStep } from "@/actions/onboarding";
import { getChannelQrAction, getChannelStatusAction } from "@/actions/whatsapp-channel";

type Props = {
  initialQr: { base64: string | null; pairingCode: string | null };
  onClose: () => void;
};

type State = "connecting" | "open" | "close" | "unknown";

export function WhatsappConnectModal({ initialQr, onClose }: Props) {
  const [qr, setQr] = useState(initialQr);
  const [state, setState] = useState<State>("connecting");
  const [number, setNumber] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const s = await getChannelStatusAction();
      if (cancelled) return;
      if (s.state === "open") {
        setState("open");
        setNumber(s.number);
        return;
      }
      if (s.state === "none") return;
      setState(s.state === "unknown" ? "connecting" : s.state);

      // Ainda não abriu → atualiza QR (regenera se expirou)
      const r = await getChannelQrAction();
      if (!cancelled) {
        setQr({ base64: r.base64 ?? null, pairingCode: r.pairingCode ?? null });
      }
    };

    tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const advance = () => {
    setAdvancing(true);
    completeWhatsappStep();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-green/60 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-card p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {state === "open" ? (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-action-green/15">
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-action-green">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="mt-4 font-display text-xl font-extrabold text-forest-green">Conectado!</h2>
            {number ? (
              <p className="mt-1 font-mono text-sm text-forest-green">+{number}</p>
            ) : null}
            <p className="mt-3 font-sans text-sm text-forest-green/70">
              O WhatsApp da igreja está conectado. A IA já pode responder mensagens conforme o FAQ.
            </p>
            <button
              type="button"
              onClick={advance}
              disabled={advancing}
              className="mt-6 w-full rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
            >
              {advancing ? "Continuando..." : "Continuar onboarding →"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-forest-green/50">
                  WhatsApp
                </p>
                <h2 className="mt-1 font-display text-xl font-extrabold text-forest-green">
                  Escaneie o QR Code
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-full p-2 text-forest-green/60 hover:bg-forest-green/5 hover:text-forest-green"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <ol className="mt-4 list-inside list-decimal space-y-1 font-sans text-xs text-forest-green/70">
              <li>Abra o WhatsApp no celular da igreja</li>
              <li>
                Toque em <strong>Mais opções</strong> → <strong>Aparelhos conectados</strong>
              </li>
              <li>
                Toque em <strong>Conectar um aparelho</strong> e aponte pro QR abaixo
              </li>
            </ol>

            <div className="mt-5 flex flex-col items-center gap-3">
              {qr.base64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr.base64} alt="QR Code" className="h-64 w-64 rounded-sm bg-white p-2" />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-sm bg-surface">
                  <p className="font-sans text-sm text-forest-green/50">Gerando QR...</p>
                </div>
              )}
              {qr.pairingCode ? (
                <p className="font-sans text-xs text-forest-green/70">
                  Código de pareamento:{" "}
                  <span className="font-mono font-bold">{qr.pairingCode}</span>
                </p>
              ) : null}
              <div className="flex items-center gap-2 font-sans text-xs text-forest-green/60">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
                </span>
                Aguardando leitura...
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
