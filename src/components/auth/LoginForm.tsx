"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthFormState } from "@/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signInAction,
    undefined,
  );

  return (
    <form action={action} className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold text-forest-green">Entrar no Gregário</h1>
        <p className="mt-2 font-sans text-sm text-forest-green/70">
          Acesso para pastores, secretaria e liderança.
        </p>
      </div>

      <div className="space-y-4 rounded-lg bg-card p-8 shadow-card">
        <Field label="Email" name="email" type="email" autoComplete="email" error={state?.errors?.email?.[0]} />
        <Field label="Senha" name="password" type="password" autoComplete="current-password" error={state?.errors?.password?.[0]} />

        {state?.message ? (
          <p className="rounded-sm bg-red-50 px-3 py-2 font-sans text-sm text-red-700">{state.message}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-gradient-to-br from-forest-green to-action-green px-4 py-3 font-display text-sm font-bold text-card transition-transform active:scale-95 disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </div>

      <p className="text-center font-sans text-sm text-forest-green/70">
        Novo na plataforma?{" "}
        <Link href="/signup" className="font-bold text-forest-green hover:underline">
          Cadastre sua igreja
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
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
        required
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green placeholder:text-forest-green/40 focus:border-forest-green/30 focus:outline-none focus:ring-2 focus:ring-forest-green/10"
      />
      {error ? <p className="mt-1 font-sans text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
