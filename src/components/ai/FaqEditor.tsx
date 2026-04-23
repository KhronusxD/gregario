"use client";

import { useActionState } from "react";
import {
  createFaqAction,
  deleteFaqAction,
  toggleFaqAction,
  updateFaqAction,
  type FaqState,
} from "@/actions/faq";

const INITIAL: FaqState = { ok: true, message: null };

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  active: boolean;
};

export function FaqCreateForm() {
  const [state, action, pending] = useActionState(createFaqAction, INITIAL);
  return (
    <form
      action={action}
      className="space-y-3 rounded-lg bg-card p-6 shadow-card"
    >
      <h3 className="font-display text-sm font-bold text-forest-green">Nova FAQ</h3>
      <input
        name="question"
        required
        placeholder="Pergunta (ex: Qual o horário do culto?)"
        className="w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2 font-sans text-sm text-forest-green"
      />
      <textarea
        name="answer"
        required
        rows={3}
        placeholder="Resposta que a IA vai usar"
        className="w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2 font-sans text-sm text-forest-green"
      />
      <input
        name="category"
        placeholder="Categoria (opcional)"
        className="w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2 font-sans text-xs text-forest-green"
      />
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2 font-display text-xs font-bold text-card disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Adicionar"}
        </button>
        {state.message ? (
          <span className={`font-sans text-xs ${state.ok ? "text-action-green" : "text-red-500"}`}>
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

export function FaqRow({ item }: { item: FaqRow }) {
  const [updState, updateAction, updPending] = useActionState(updateFaqAction, INITIAL);
  const [, toggleAction, togglePending] = useActionState(toggleFaqAction, INITIAL);
  const [, deleteAction, deletePending] = useActionState(deleteFaqAction, INITIAL);

  return (
    <div className="rounded-lg bg-card p-4 shadow-card">
      <form action={updateAction} className="space-y-2">
        <input type="hidden" name="id" value={item.id} />
        <input
          name="question"
          defaultValue={item.question}
          required
          className="w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2 font-sans text-sm font-bold text-forest-green"
        />
        <textarea
          name="answer"
          defaultValue={item.answer}
          required
          rows={3}
          className="w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2 font-sans text-sm text-forest-green"
        />
        <input
          name="category"
          defaultValue={item.category ?? ""}
          placeholder="Categoria"
          className="w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2 font-sans text-xs text-forest-green"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={updPending}
              className="rounded-full bg-forest-green/10 px-4 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green hover:bg-forest-green/15 disabled:opacity-60"
            >
              {updPending ? "..." : "Salvar"}
            </button>
            <span
              className={`rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest ${
                item.active ? "bg-action-green/15 text-action-green" : "bg-forest-green/10 text-forest-green/50"
              }`}
            >
              {item.active ? "Ativa" : "Inativa"}
            </span>
          </div>
          {updState.message ? (
            <span className={`font-sans text-xs ${updState.ok ? "text-action-green" : "text-red-500"}`}>
              {updState.message}
            </span>
          ) : null}
        </div>
      </form>
      <div className="mt-3 flex items-center gap-2 border-t border-forest-green/5 pt-3">
        <form action={toggleAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="active" value={String(item.active)} />
          <button
            type="submit"
            disabled={togglePending}
            className="rounded-full bg-yellow-400/15 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-yellow-700 hover:bg-yellow-400/25 disabled:opacity-60"
          >
            {item.active ? "Desativar" : "Ativar"}
          </button>
        </form>
        <form
          action={(fd) => {
            if (confirm("Remover essa FAQ?")) deleteAction(fd);
          }}
        >
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            disabled={deletePending}
            className="rounded-full bg-red-500/10 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-500/20 disabled:opacity-60"
          >
            Remover
          </button>
        </form>
      </div>
    </div>
  );
}
