"use client";

import { useActionState, useState, useTransition } from "react";
import {
  saveNotificationSettingsAction,
  sendTestNotificationAction,
  type NotificationFormState,
} from "@/actions/notifications";

const INITIAL: NotificationFormState = { ok: true, message: null };

function formatBR(digits: string | null | undefined): string {
  if (!digits) return "";
  const d = digits.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return d;
}

type Props = {
  initialActive: boolean;
  initialPhone: string | null;
};

export function NotificationsCard({ initialActive, initialPhone }: Props) {
  const [active, setActive] = useState(initialActive);
  const [phone, setPhone] = useState(formatBR(initialPhone));
  const [saveState, save] = useActionState(saveNotificationSettingsAction, INITIAL);
  const [testState, test] = useActionState(sendTestNotificationAction, INITIAL);
  const [savePending, startSave] = useTransition();
  const [testPending, startTest] = useTransition();

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-card p-6 shadow-card">
        <h3 className="mb-1 font-display text-base font-bold text-forest-green">
          Alertas de urgência
        </h3>
        <p className="mb-6 font-sans text-sm text-forest-green/70">
          Receba uma mensagem no WhatsApp sempre que a IA precisar de intervenção humana —
          handoff pastoral, transferência solicitada por contato, limite de mensagens.
        </p>

        <form
          action={(fd) => startSave(() => save(fd))}
          className="space-y-5"
        >
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="notify_active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="mt-1 h-4 w-4 accent-forest-green"
            />
            <span>
              <span className="font-display text-sm font-bold text-forest-green">
                Receber notificações
              </span>
              <span className="block font-sans text-xs text-forest-green/60">
                Liga/desliga o disparo de alertas pro número abaixo.
              </span>
            </span>
          </label>

          <div>
            <label className="mb-1 block font-display text-xs font-bold uppercase tracking-widest text-forest-green/60">
              Número WhatsApp
            </label>
            <input
              name="notify_phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full rounded-md bg-forest-green/[0.04] px-3 py-2 font-sans text-sm text-forest-green outline-none focus:bg-forest-green/[0.08]"
            />
            <p className="mt-1 font-sans text-xs text-forest-green/50">
              Formato brasileiro. Aceita com ou sem +55. Ex: <span className="font-mono">(11) 99999-9999</span>,
              <span className="font-mono"> 11999999999</span>, <span className="font-mono">+5511999999999</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savePending}
              className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-card transition-transform active:scale-95 disabled:opacity-50"
            >
              {savePending ? "Salvando..." : "Salvar"}
            </button>
            {saveState.message ? (
              <span
                className={`font-sans text-xs ${saveState.ok ? "text-action-green" : "text-red-500"}`}
              >
                {saveState.message}
              </span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-lg bg-card p-6 shadow-card">
        <h3 className="mb-1 font-display text-base font-bold text-forest-green">
          Testar disparo
        </h3>
        <p className="mb-4 font-sans text-sm text-forest-green/70">
          Envia uma mensagem de teste pro número configurado, usando o canal Evolution
          do workspace. Funciona apenas se as notificações estiverem ativas e o canal
          WhatsApp estiver conectado.
        </p>
        <form action={(fd) => startTest(() => test(fd))} className="flex items-center gap-3">
          <button
            type="submit"
            disabled={testPending}
            className="rounded-full bg-forest-green/10 px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-forest-green hover:bg-forest-green/15 disabled:opacity-50"
          >
            {testPending ? "Enviando..." : "Enviar teste"}
          </button>
          {testState.message ? (
            <span
              className={`font-sans text-xs ${testState.ok ? "text-action-green" : "text-red-500"}`}
            >
              {testState.message}
            </span>
          ) : null}
        </form>
      </section>
    </div>
  );
}
