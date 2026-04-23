"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  createChannelAction,
  deleteChannelAction,
  getChannelQrAction,
  getChannelStatusAction,
  logoutChannelAction,
  regenerateQrAction,
  restartChannelAction,
  type ChannelStatus,
  type WhatsappChannelState,
} from "@/actions/whatsapp-channel";
import { ConnectLinkShare } from "./ConnectLinkShare";

const INITIAL: WhatsappChannelState = { ok: true, message: null };

type Props = {
  hasInstance: boolean;
  instanceName: string | null;
  metaPhoneNumberId: string | null;
};

const STATE_LABEL: Record<ChannelStatus["state"], { label: string; cls: string }> = {
  open: { label: "Conectado", cls: "bg-action-green text-card" },
  connecting: { label: "Conectando", cls: "bg-yellow-400/20 text-yellow-700" },
  close: { label: "Desconectado", cls: "bg-red-500/15 text-red-600" },
  unknown: { label: "Indefinido", cls: "bg-forest-green/10 text-forest-green/60" },
  none: { label: "Sem instância", cls: "bg-forest-green/10 text-forest-green/50" },
};

export function WhatsappChannelCard({ hasInstance, instanceName, metaPhoneNumberId }: Props) {
  const [status, setStatus] = useState<ChannelStatus | null>(null);
  const [qr, setQr] = useState<{ base64: string | null; pairingCode: string | null; error?: string } | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [, start] = useTransition();

  const [createState, create] = useActionState(createChannelAction, INITIAL);
  const [regenState, regen] = useActionState(regenerateQrAction, INITIAL);
  const [logoutState, logout] = useActionState(logoutChannelAction, INITIAL);
  const [restartState, restart] = useActionState(restartChannelAction, INITIAL);
  const [deleteState, remove] = useActionState(deleteChannelAction, INITIAL);

  const refreshStatus = async () => {
    setLoadingStatus(true);
    const s = await getChannelStatusAction();
    setStatus(s);
    setLoadingStatus(false);
  };

  const loadQr = async () => {
    const r = await getChannelQrAction();
    setQr(r.base64 || r.pairingCode ? { base64: r.base64, pairingCode: r.pairingCode } : { base64: null, pairingCode: null, error: r.message });
  };

  useEffect(() => {
    if (!hasInstance) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshStatus();
    const id = setInterval(refreshStatus, 8000);
    return () => clearInterval(id);
  }, [hasInstance]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (showQr) loadQr();
  }, [showQr]);

  const currentState = status?.state ?? (hasInstance ? "unknown" : "none");
  const badge = STATE_LABEL[currentState];
  const message =
    createState.message || regenState.message || logoutState.message || restartState.message || deleteState.message;
  const messageOk = [createState, regenState, logoutState, restartState, deleteState].every((s) => s.ok);

  if (!hasInstance) {
    return (
      <section className="rounded-lg bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-forest-green">Canal WhatsApp</h3>
            <p className="mt-1 font-sans text-sm text-forest-green/60">
              Nenhuma instância criada ainda. Conecte agora para ativar a secretaria IA.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
        <form action={(fd) => start(() => create(fd))} className="mt-6">
          <button
            type="submit"
            className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-card transition-transform active:scale-95"
          >
            Criar instância Evolution
          </button>
        </form>
        {createState.message ? (
          <p className={`mt-3 font-sans text-xs ${createState.ok ? "text-action-green" : "text-red-500"}`}>
            {createState.message}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg bg-card p-6 shadow-card">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-display text-base font-bold text-forest-green">Canal WhatsApp</h3>
            <span className={`rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="mt-1 font-sans text-xs text-forest-green/60">
            Instância: <span className="font-mono">{instanceName}</span>
          </p>
          {status?.number ? (
            <p className="mt-1 font-sans text-sm text-forest-green">
              Número: <span className="font-mono font-bold">+{status.number}</span>
              {status.profileName ? ` · ${status.profileName}` : ""}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={refreshStatus}
          disabled={loadingStatus}
          className="rounded-full bg-forest-green/10 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green hover:bg-forest-green/15 disabled:opacity-50"
        >
          {loadingStatus ? "..." : "Atualizar"}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-t border-forest-green/5 pt-4">
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="rounded-full bg-forest-green/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green hover:bg-forest-green/15"
        >
          {showQr ? "Ocultar QR" : "Ver QR"}
        </button>
        <form action={(fd) => start(() => regen(fd))}>
          <button
            type="submit"
            className="rounded-full bg-forest-green/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green hover:bg-forest-green/15"
          >
            Gerar novo QR
          </button>
        </form>
        <form action={(fd) => start(() => restart(fd))}>
          <button
            type="submit"
            className="rounded-full bg-forest-green/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green hover:bg-forest-green/15"
          >
            Reiniciar
          </button>
        </form>
        <form action={(fd) => start(() => logout(fd))}>
          <button
            type="submit"
            className="rounded-full bg-yellow-400/15 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-yellow-700 hover:bg-yellow-400/25"
          >
            Desconectar
          </button>
        </form>
        <form
          action={(fd) => {
            if (confirm("Remover canal e apagar a instância? Esta ação é irreversível.")) {
              start(() => remove(fd));
            }
          }}
        >
          <button
            type="submit"
            className="rounded-full bg-red-500/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-500/20"
          >
            Remover canal
          </button>
        </form>
      </div>

      {message ? (
        <p className={`font-sans text-xs ${messageOk ? "text-action-green" : "text-red-500"}`}>{message}</p>
      ) : null}

      {showQr ? (
        <div className="rounded-lg bg-surface p-6">
          {!qr ? (
            <p className="font-sans text-sm text-forest-green/60">Carregando QR...</p>
          ) : qr.error ? (
            <p className="font-sans text-sm text-red-500">{qr.error}</p>
          ) : qr.base64 ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.base64} alt="QR Code" className="h-64 w-64 rounded-sm bg-white p-2" />
              <p className="font-sans text-xs text-forest-green/60">
                Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho
              </p>
              {qr.pairingCode ? (
                <p className="font-sans text-xs text-forest-green/70">
                  Código de pareamento: <span className="font-mono font-bold">{qr.pairingCode}</span>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="font-sans text-sm text-forest-green/60">
              Já conectado ou QR indisponível. Use &quot;Gerar novo QR&quot; se precisar reconectar.
            </p>
          )}
        </div>
      ) : null}

      <ConnectLinkShare />

      {metaPhoneNumberId ? (
        <div className="rounded-lg border border-forest-green/10 bg-surface p-4">
          <p className="font-display text-xs font-bold text-forest-green">Meta Cloud API</p>
          <p className="mt-1 font-sans text-xs text-forest-green/60">
            Phone Number ID: <span className="font-mono">{metaPhoneNumberId}</span>
          </p>
          <p className="mt-1 font-sans text-[10px] text-forest-green/50">
            Gerenciamento da API oficial ainda não disponível nesta tela. Mensagens enviadas pela Meta continuam funcionando.
          </p>
        </div>
      ) : null}
    </section>
  );
}
