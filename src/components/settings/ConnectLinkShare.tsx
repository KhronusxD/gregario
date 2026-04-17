"use client";

import { useState, useTransition } from "react";
import { createConnectLinkAction } from "@/actions/whatsapp-channel";

function normalizeBR(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export function ConnectLinkShare() {
  const [link, setLink] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState("");
  const [pending, start] = useTransition();

  const generate = () =>
    start(async () => {
      const r = await createConnectLinkAction();
      if (!r.ok || !r.url) {
        setError(r.message ?? "Falha ao gerar link");
        setLink(null);
        return;
      }
      setError(null);
      setLink(r.url);
      setNote(r.message ?? null);
      setCopied(false);
    });

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const waHref = link && phone
    ? `https://wa.me/${normalizeBR(phone)}?text=${encodeURIComponent(`Link pra conectar o WhatsApp da igreja (válido por 30min): ${link}`)}`
    : null;
  const mailtoHref = link
    ? `mailto:?subject=${encodeURIComponent("Conectar WhatsApp da igreja")}&body=${encodeURIComponent(`Abra este link no celular que vai conectar (válido por 30min):\n\n${link}`)}`
    : null;

  return (
    <div className="rounded-lg border border-forest-green/10 bg-surface p-4">
      <p className="font-display text-xs font-bold text-forest-green">Enviar link de conexão</p>
      <p className="mt-1 font-sans text-xs text-forest-green/60">
        Gere um link temporário (30min) pra quem for escanear o QR no celular — útil pra configurar remoto.
      </p>

      {!link ? (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="mt-3 rounded-full bg-forest-green/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green hover:bg-forest-green/15 disabled:opacity-50"
        >
          {pending ? "Gerando..." : "Gerar link"}
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 rounded-full bg-card px-3 py-2 font-mono text-[11px] text-forest-green"
              onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={copy}
              className="rounded-full bg-forest-green/10 px-3 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green hover:bg-forest-green/15"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(opcional) DDD+número do responsável"
              className="flex-1 rounded-full bg-card px-3 py-2 font-sans text-xs text-forest-green"
            />
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-action-green px-3 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-card"
              >
                Enviar WhatsApp
              </a>
            ) : (
              <span className="rounded-full bg-forest-green/5 px-3 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green/40">
                Enviar WhatsApp
              </span>
            )}
            {mailtoHref ? (
              <a
                href={mailtoHref}
                className="rounded-full bg-forest-green/10 px-3 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green hover:bg-forest-green/15"
              >
                E-mail
              </a>
            ) : null}
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="font-sans text-[11px] text-forest-green/60 underline hover:text-forest-green"
          >
            Gerar novo
          </button>

          {note ? <p className="font-sans text-[10px] text-forest-green/50">{note}</p> : null}
        </div>
      )}

      {error ? <p className="mt-2 font-sans text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
