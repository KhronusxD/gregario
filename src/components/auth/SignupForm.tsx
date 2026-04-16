"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type AuthFormState } from "@/actions/auth";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signUpAction,
    undefined,
  );

  return (
    <form action={action} className="w-full max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold text-forest-green">Cadastre sua igreja</h1>
        <p className="mt-2 font-sans text-sm text-forest-green/70">
          14 dias grátis. Sem cartão.
        </p>
      </div>

      <div className="space-y-4 rounded-lg bg-card p-8 shadow-card">
        <Field label="Nome da igreja" name="churchName" error={state?.errors?.churchName?.[0]} />
        <Field label="Denominação (opcional)" name="denomination" required={false} error={state?.errors?.denomination?.[0]} />
        <Field label="Seu nome (pastor)" name="pastorName" error={state?.errors?.pastorName?.[0]} />
        <Field label="Email" name="email" type="email" autoComplete="email" error={state?.errors?.email?.[0]} />
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres, com letra e número."
          error={state?.errors?.password?.[0]}
        />

        {state?.message ? (
          <p className="rounded-sm bg-red-50 px-3 py-2 font-sans text-sm text-red-700">{state.message}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-gradient-to-br from-forest-green to-action-green px-4 py-3 font-display text-sm font-bold text-card transition-transform active:scale-95 disabled:opacity-60"
        >
          {pending ? "Criando conta..." : "Criar conta e começar"}
        </button>
      </div>

      <p className="text-center font-sans text-sm text-forest-green/70">
        Já tem conta?{" "}
        <Link href="/login" className="font-bold text-forest-green hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  hint,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green placeholder:text-forest-green/40 focus:border-forest-green/30 focus:outline-none focus:ring-2 focus:ring-forest-green/10"
      />
      {hint && !error ? <p className="mt-1 font-sans text-xs text-forest-green/50">{hint}</p> : null}
      {error ? <p className="mt-1 font-sans text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
