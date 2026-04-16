"use client";

import { useActionState, useTransition } from "react";
import { createFlowAction, type FlowFormState } from "@/actions/flows";

const INITIAL: FlowFormState = { ok: true, message: null };

export function CreateFlowForm() {
  const [state, action] = useActionState(createFlowAction, INITIAL);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => start(() => action(fd))}
      className="rounded-lg bg-card p-6 shadow-card"
    >
      <p className="font-display text-sm font-bold text-forest-green">Novo fluxo</p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          name="name"
          required
          minLength={2}
          placeholder="Ex: Boas-vindas primeiro contato"
          className="rounded-full bg-forest-green/[0.04] px-4 py-2.5 font-sans text-sm text-forest-green outline-none focus:bg-forest-green/[0.08]"
        />
        <select
          name="trigger_type"
          required
          defaultValue="welcome"
          className="rounded-full bg-forest-green/[0.04] px-4 py-2.5 font-sans text-sm text-forest-green outline-none focus:bg-forest-green/[0.08]"
        >
          <option value="welcome">Boas-vindas</option>
          <option value="keyword">Palavra-chave</option>
          <option value="first_contact">Primeiro contato</option>
          <option value="member_updated">Cadastro atualizado</option>
          <option value="event_registered">Inscrição em evento</option>
          <option value="manual">Manual</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-card transition-transform active:scale-95 disabled:opacity-50"
        >
          {pending ? "Criando..." : "Criar fluxo"}
        </button>
      </div>
      <input type="hidden" name="description" value="" />
      {state.message ? (
        <p className={`mt-3 font-sans text-xs ${state.ok ? "text-action-green" : "text-red-500"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
