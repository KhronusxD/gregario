"use client";

import { useActionState, useTransition } from "react";
import { toggleFlowAction, deleteFlowAction, type FlowFormState } from "@/actions/flows";

const INITIAL: FlowFormState = { ok: true, message: null };

const TRIGGER_LABELS: Record<string, string> = {
  welcome: "Boas-vindas",
  keyword: "Palavra-chave",
  first_contact: "Primeiro contato",
  member_updated: "Cadastro atualizado",
  event_registered: "Inscrição em evento",
  manual: "Manual",
};

export function FlowListItem({
  flow,
}: {
  flow: { id: string; name: string; description: string | null; trigger_type: string; enabled: boolean };
}) {
  const [, toggle] = useActionState(toggleFlowAction, INITIAL);
  const [, remove] = useActionState(deleteFlowAction, INITIAL);
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center justify-between border-b border-forest-green/5 p-4 last:border-b-0">
      <a href={`/dashboard/ai/flows/${flow.id}`} className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-forest-green">{flow.name}</p>
        <p className="font-sans text-xs text-forest-green/50">
          {TRIGGER_LABELS[flow.trigger_type] ?? flow.trigger_type}
          {flow.description ? ` · ${flow.description}` : ""}
        </p>
      </a>
      <div className="flex items-center gap-2">
        <form action={(fd) => start(() => toggle(fd))}>
          <input type="hidden" name="id" value={flow.id} />
          <input type="hidden" name="enabled" value={String(!flow.enabled)} />
          <button
            type="submit"
            disabled={pending}
            className={`rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest ${
              flow.enabled
                ? "bg-action-green text-card"
                : "bg-forest-green/10 text-forest-green/60"
            } disabled:opacity-50`}
          >
            {flow.enabled ? "Ativo" : "Inativo"}
          </button>
        </form>
        <form
          action={(fd) => start(() => {
            if (confirm(`Remover "${flow.name}"?`)) remove(fd);
          })}
        >
          <input type="hidden" name="id" value={flow.id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-forest-green/10 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green/60 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
          >
            Remover
          </button>
        </form>
      </div>
    </div>
  );
}
