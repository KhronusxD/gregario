"use client";

import { useActionState } from "react";
import { importMembersStep, type OnboardingState } from "@/actions/onboarding";
import { Stepper } from "@/components/onboarding/Stepper";

export default function ImportMembersStep() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    importMembersStep,
    undefined,
  );

  return (
    <>
      <Stepper current={4} />
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-forest-green">Importar membros</h1>
        <p className="mt-2 font-sans text-sm text-forest-green/70">
          Cole uma planilha CSV no formato <span className="font-bold">nome, telefone, email</span> (um por linha).
        </p>
      </header>

      <form action={action} className="space-y-5 rounded-lg bg-card p-8 shadow-card">
        <textarea
          name="csv"
          rows={10}
          placeholder={"Maria Souza,11988887777,maria@exemplo.com\nJoão Lima,11977776666,\nElena R.,11966665555,elena@..."}
          className="w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-mono text-xs text-forest-green"
        />

        {state?.message ? (
          <p className="rounded-sm bg-red-50 px-3 py-2 font-sans text-sm text-red-700">{state.message}</p>
        ) : null}

        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-forest-green/60">
            Deixar em branco pula esta etapa — você pode importar depois em Secretaria.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
          >
            {pending ? "Importando..." : "Continuar →"}
          </button>
        </div>
      </form>
    </>
  );
}
