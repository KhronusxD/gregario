"use client";

import { useActionState, useState } from "react";
import { saveFaqStep, type OnboardingState } from "@/actions/onboarding";
import { Stepper } from "@/components/onboarding/Stepper";

const DEFAULT_FAQ = [
  { q: "Qual o horário dos cultos?", a: "Consulte o app da igreja ou o link fixado no perfil." },
  { q: "Qual o endereço da igreja?", a: "Veja no app ou chame um membro da equipe." },
  { q: "Como falo com o pastor?", a: "Escreva sua demanda aqui que encaminhamos ao pastor." },
  { q: "Como me tornar membro?", a: "Participe de 3 cultos consecutivos e fale com a secretaria." },
  { q: "Como fazer o dízimo pelo celular?", a: "Pelo app do membro em Contribuições — aceita Pix." },
];

export default function FaqStep() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    saveFaqStep,
    undefined,
  );
  const [rows, setRows] = useState(DEFAULT_FAQ);

  const update = (i: number, key: "q" | "a", val: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  };
  const remove = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const add = () => setRows((prev) => [...prev, { q: "", a: "" }]);

  return (
    <>
      <Stepper current={2} />
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-forest-green">FAQ da secretaria IA</h1>
        <p className="mt-2 font-sans text-sm text-forest-green/70">
          Perguntas e respostas que a IA usa para responder no WhatsApp. Edite à vontade.
        </p>
      </header>
      <form action={action} className="space-y-4 rounded-lg bg-card p-8 shadow-card">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-3 rounded-sm border border-forest-green/10 bg-surface p-4 md:grid-cols-[1fr_1fr_auto]">
            <input
              name="question"
              placeholder="Pergunta"
              value={r.q}
              onChange={(e) => update(i, "q", e.target.value)}
              className="rounded-sm border border-forest-green/10 bg-card px-3 py-2 font-sans text-sm text-forest-green"
            />
            <input
              name="answer"
              placeholder="Resposta"
              value={r.a}
              onChange={(e) => update(i, "a", e.target.value)}
              className="rounded-sm border border-forest-green/10 bg-card px-3 py-2 font-sans text-sm text-forest-green"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="rounded-sm bg-forest-green/[0.06] px-3 py-2 font-display text-xs font-bold text-forest-green/70 hover:bg-forest-green/[0.1]"
            >
              Remover
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={add}
          className="rounded-full border border-forest-green/10 px-4 py-2 font-display text-xs font-bold text-forest-green/70 hover:bg-forest-green/[0.06]"
        >
          + Adicionar pergunta
        </button>

        {state?.message ? (
          <p className="rounded-sm bg-red-50 px-3 py-2 font-sans text-sm text-red-700">{state.message}</p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Continuar →"}
          </button>
        </div>
      </form>
    </>
  );
}
