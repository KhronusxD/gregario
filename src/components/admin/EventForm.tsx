"use client";

import { useActionState } from "react";
import { createEventAction, type EventFormState } from "@/actions/events";

export function EventForm() {
  const [state, action, pending] = useActionState<EventFormState, FormData>(
    createEventAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-5 rounded-lg bg-card p-8 shadow-card">
      <Text label="Título" name="title" required error={state?.errors?.title?.[0]} />
      <Area label="Descrição" name="description" />
      <div className="grid gap-5 md:grid-cols-2">
        <Text label="Início" name="starts_at" type="datetime-local" required error={state?.errors?.starts_at?.[0]} />
        <Text label="Fim (opcional)" name="ends_at" type="datetime-local" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Text label="Local" name="location" />
        <Text label="Capacidade" name="capacity" type="number" />
      </div>
      <label className="flex items-center gap-3 font-sans text-sm text-forest-green">
        <input type="checkbox" name="registration_open" defaultChecked className="h-4 w-4" />
        Inscrições abertas
      </label>

      {state?.message ? (
        <p className="rounded-sm bg-red-50 px-3 py-2 font-sans text-sm text-red-700">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar evento"}
      </button>
    </form>
  );
}

function Text({
  label,
  name,
  type = "text",
  required,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green focus:border-forest-green/30 focus:outline-none focus:ring-2 focus:ring-forest-green/10"
      />
      {error ? <p className="mt-1 font-sans text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function Area({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
        {label}
      </label>
      <textarea
        name={name}
        rows={3}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green focus:border-forest-green/30 focus:outline-none focus:ring-2 focus:ring-forest-green/10"
      />
    </div>
  );
}
