"use client";

import { useActionState } from "react";
import { createContributionAction, type ContribFormState } from "@/actions/contributions";

export function ContributionForm({
  members,
}: {
  members: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ContribFormState, FormData>(
    createContributionAction,
    undefined,
  );

  return (
    <form action={action} className="grid gap-4 rounded-lg bg-card p-6 shadow-card md:grid-cols-6">
      <label className="md:col-span-2">
        <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-forest-green/60">Membro</span>
        <select
          name="member_id"
          className="mt-1 w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2.5 font-sans text-sm text-forest-green"
        >
          <option value="">Não identificado</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-forest-green/60">Categoria</span>
        <select
          name="category"
          required
          className="mt-1 w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2.5 font-sans text-sm text-forest-green"
        >
          <option value="dizimo">Dízimo</option>
          <option value="oferta">Oferta</option>
          <option value="missoes">Missões</option>
          <option value="construcao">Construção</option>
          <option value="outros">Outros</option>
        </select>
      </label>
      <label>
        <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-forest-green/60">Valor (R$)</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          className="mt-1 w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2.5 font-sans text-sm text-forest-green"
        />
      </label>
      <label>
        <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-forest-green/60">Data</span>
        <input
          name="paid_at"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="mt-1 w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2.5 font-sans text-sm text-forest-green"
        />
      </label>
      <label>
        <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-forest-green/60">Forma</span>
        <select
          name="method"
          required
          className="mt-1 w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2.5 font-sans text-sm text-forest-green"
        >
          <option value="pix">Pix</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="cartao">Cartão</option>
          <option value="transferencia">Transferência</option>
        </select>
      </label>
      <label className="md:col-span-5">
        <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-forest-green/60">Observação</span>
        <input
          name="note"
          className="mt-1 w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2.5 font-sans text-sm text-forest-green"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2.5 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
      >
        {pending ? "..." : "Lançar"}
      </button>
      {state?.message ? (
        <p className="md:col-span-6 rounded-sm bg-accent-green/20 px-3 py-2 font-sans text-xs text-forest-green">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
