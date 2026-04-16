"use client";

import { useActionState } from "react";
import { createContentAction, type ContentFormState } from "@/actions/content";
import { PageHeader } from "@/components/admin/PageHeader";

export default function NewContentPage() {
  const [state, action, pending] = useActionState<ContentFormState, FormData>(
    createContentAction,
    undefined,
  );

  return (
    <main className="ml-64 max-w-2xl p-10">
      <PageHeader eyebrow="Biblioteca" title="Novo conteúdo" />
      <form action={action} className="space-y-5 rounded-lg bg-card p-8 shadow-card">
        <Field label="Título" name="title" required error={state?.errors?.title?.[0]} />
        <Select
          label="Tipo"
          name="kind"
          options={[
            { v: "devocional", l: "Devocional" },
            { v: "resumo_culto", l: "Resumo de culto" },
            { v: "seminario", l: "Seminário" },
          ]}
        />
        <Area label="Texto (markdown simples)" name="body" />
        <Field label="URL do YouTube" name="youtube_url" type="url" />
        <Field label="URL do Spotify" name="spotify_url" type="url" />
        <Field label="Capa (URL)" name="thumbnail_url" type="url" />
        <Select
          label="Status"
          name="status"
          options={[
            { v: "publicado", l: "Publicar agora" },
            { v: "rascunho", l: "Salvar como rascunho" },
          ]}
        />
        {state?.message ? (
          <p className="rounded-sm bg-red-50 px-3 py-2 font-sans text-sm text-red-700">{state.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Publicar"}
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
      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
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
        rows={8}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green"
      />
    </div>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">{label}</label>
      <select
        name={name}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}
