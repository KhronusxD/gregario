"use client";

import { useActionState, useTransition } from "react";
import { Bot } from "lucide-react";
import { toggleAIActive, type AIConfigFormState } from "@/actions/ai";

const INITIAL: AIConfigFormState = { ok: true, message: null };

export function AIMasterToggle({ active }: { active: boolean }) {
  const [state, formAction] = useActionState(toggleAIActive, INITIAL);
  const [pending, start] = useTransition();

  const next = !active;

  return (
    <form
      action={(fd) => start(() => formAction(fd))}
      className="flex items-center gap-4 rounded-lg bg-card p-5 shadow-card"
    >
      <input type="hidden" name="active" value={String(next)} />
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${active ? "bg-action-green/20" : "bg-forest-green/[0.06]"}`}>
        <Bot className={`h-6 w-6 ${active ? "text-action-green" : "text-forest-green/40"}`} />
      </div>
      <div className="flex-1">
        <p className="font-display text-base font-bold text-forest-green">
          {active ? "IA ativa" : "IA desligada"}
        </p>
        <p className="font-sans text-xs text-forest-green/60">
          {active ? "A secretaria virtual está atendendo membros no WhatsApp." : "Todas as conversas vão direto para humanos."}
        </p>
        {state.message ? (
          <p className={`mt-1 text-xs ${state.ok ? "text-action-green" : "text-red-500"}`}>{state.message}</p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={pending}
        className={`rounded-full px-5 py-2.5 font-display text-xs font-bold uppercase tracking-widest transition-all ${
          active
            ? "bg-forest-green/10 text-forest-green hover:bg-forest-green/15"
            : "bg-gradient-to-br from-forest-green to-action-green text-card"
        } disabled:opacity-50`}
      >
        {pending ? "..." : active ? "Desligar" : "Ativar"}
      </button>
    </form>
  );
}
