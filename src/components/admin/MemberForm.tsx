"use client";

import { useActionState } from "react";
import { MEMBER_STATUS } from "@/lib/members";
import type { MemberFormState } from "@/actions/members";

type Member = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null;
  status?: string | null;
  gender?: string | null;
  address?: string | null;
  baptism_date?: string | null;
  joined_at?: string | null;
  notes?: string | null;
};

export function MemberForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: MemberFormState, formData: FormData) => Promise<MemberFormState>;
  initial?: Member;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<MemberFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-6 rounded-lg bg-card p-8 shadow-card">
      <Row>
        <Field label="Nome completo" name="name" defaultValue={initial?.name ?? ""} required error={state?.errors?.name?.[0]} />
        <Field label="WhatsApp" name="phone" type="tel" placeholder="+55 11 98765-4321" defaultValue={initial?.phone ?? ""} error={state?.errors?.phone?.[0]} />
      </Row>
      <Row>
        <Field label="Email" name="email" type="email" defaultValue={initial?.email ?? ""} error={state?.errors?.email?.[0]} />
        <Field label="Data de nascimento" name="birth_date" type="date" defaultValue={initial?.birth_date ?? ""} />
      </Row>
      <Row>
        <Select
          label="Situação"
          name="status"
          defaultValue={initial?.status ?? "visitante"}
          options={Object.entries(MEMBER_STATUS).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <Select
          label="Gênero"
          name="gender"
          defaultValue={initial?.gender ?? ""}
          options={[
            { value: "", label: "—" },
            { value: "M", label: "Masculino" },
            { value: "F", label: "Feminino" },
          ]}
        />
      </Row>
      <Field label="Endereço" name="address" defaultValue={initial?.address ?? ""} />
      <Row>
        <Field label="Data de batismo" name="baptism_date" type="date" defaultValue={initial?.baptism_date ?? ""} />
        <Field label="Ingresso na igreja" name="joined_at" type="date" defaultValue={initial?.joined_at ?? ""} />
      </Row>
      <div>
        <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
          Notas pastorais (privado)
        </label>
        <textarea
          name="notes"
          rows={4}
          defaultValue={initial?.notes ?? ""}
          className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green focus:border-forest-green/30 focus:outline-none focus:ring-2 focus:ring-forest-green/10"
        />
      </div>

      {state?.message ? (
        <p className="rounded-sm bg-accent-green/20 px-3 py-2 font-sans text-sm text-forest-green">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
      >
        {pending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 md:grid-cols-2">{children}</div>;
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
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
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green placeholder:text-forest-green/40 focus:border-forest-green/30 focus:outline-none focus:ring-2 focus:ring-forest-green/10"
      />
      {error ? <p className="mt-1 font-sans text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
        {label}
      </label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green focus:border-forest-green/30 focus:outline-none focus:ring-2 focus:ring-forest-green/10"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
