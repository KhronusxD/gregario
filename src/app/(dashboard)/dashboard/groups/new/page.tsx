"use client";

import { useActionState } from "react";
import { createGroupAction, type GroupFormState } from "@/actions/groups";
import { PageHeader } from "@/components/admin/PageHeader";

export default function NewGroupPage() {
  const [state, action, pending] = useActionState<GroupFormState, FormData>(
    createGroupAction,
    undefined,
  );
  return (
    <main className="ml-64 max-w-2xl p-10">
      <PageHeader eyebrow="Comunidade" title="Novo grupo" />
      <form action={action} className="space-y-5 rounded-lg bg-card p-8 shadow-card">
        <Field label="Nome" name="name" required error={state?.errors?.name?.[0]} />
        <Area label="Descrição" name="description" />
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Dia de encontro" name="meeting_day" placeholder="Quarta" />
          <Field label="Horário" name="meeting_time" type="time" />
        </div>
        <Field label="Endereço" name="address" />
        {state?.message ? (
          <p className="rounded-sm bg-red-50 px-3 py-2 font-sans text-sm text-red-700">{state.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
        >
          {pending ? "Criando..." : "Criar grupo"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green"
      />
      {error ? <p className="mt-1 font-sans text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function Area({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">{label}</label>
      <textarea
        name={name}
        rows={3}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green"
      />
    </div>
  );
}
