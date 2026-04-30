"use client";

import { useActionState, useTransition } from "react";
import { backfillContactsAction, type BackfillResult } from "@/actions/whatsapp-channel";

const INITIAL: BackfillResult = { ok: true, message: null };

export function SyncContactsCard() {
  const [state, run] = useActionState(backfillContactsAction, INITIAL);
  const [pending, start] = useTransition();

  return (
    <section className="mt-6 rounded-lg bg-card p-6 shadow-card">
      <h3 className="mb-1 font-display text-base font-bold text-forest-green">
        Sincronizar nomes e fotos dos contatos
      </h3>
      <p className="mb-4 font-sans text-sm text-forest-green/70">
        Busca o pushName e a foto de perfil de todos os contatos do WhatsApp via Evolution.
        Pula contatos que já estão completos. Limita a 5 chamadas em paralelo.
      </p>
      <form action={(fd) => start(() => run(fd))} className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-card transition-transform active:scale-95 disabled:opacity-50"
        >
          {pending ? "Sincronizando..." : "Atualizar agora"}
        </button>
        {state.message ? (
          <span className={`font-sans text-xs ${state.ok ? "text-action-green" : "text-red-500"}`}>
            {state.message}
          </span>
        ) : null}
      </form>
    </section>
  );
}
