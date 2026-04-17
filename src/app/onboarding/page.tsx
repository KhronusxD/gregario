"use client";

import { useActionState } from "react";
import { saveChurchStep, type OnboardingState } from "@/actions/onboarding";
import { Stepper } from "@/components/onboarding/Stepper";

export default function ChurchDataStep() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    saveChurchStep,
    undefined,
  );

  return (
    <>
      <Stepper current={1} />
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-forest-green">Dados da igreja</h1>
        <p className="mt-2 font-sans text-sm text-forest-green/70">
          Esses dados alimentam o app do membro e a secretaria IA.
        </p>
      </header>
      <form action={action} className="space-y-5 rounded-lg bg-card p-8 shadow-card">
        <Text label="Nome da igreja" name="name" required defaultValue={state?.values?.name} />
        <Text label="Denominação" name="denomination" defaultValue={state?.values?.denomination} />
        <Text label="Endereço completo" name="address" defaultValue={state?.values?.address} />
        <div className="grid gap-5 md:grid-cols-2">
          <Text label="Telefone da secretaria" name="phone" type="tel" defaultValue={state?.values?.phone} />
          <Text label="WhatsApp do pastor titular" name="pastor_phone" type="tel" defaultValue={state?.values?.pastor_phone} />
        </div>
        <Area
          label="Horários de culto"
          name="service_schedule"
          placeholder="Ex: Dom 9h e 19h, Qua 19h30"
          defaultValue={state?.values?.service_schedule}
        />
        <Area
          label="Frase de boas-vindas (app do membro)"
          name="welcome_message"
          placeholder='Ex: "Que bom ter você aqui na Batista Central!"'
          defaultValue={state?.values?.welcome_message}
        />
        {state?.message ? (
          <p className="rounded-sm bg-red-50 px-3 py-2 font-sans text-sm text-red-700">{state.message}</p>
        ) : null}
        {state?.errors ? (
          <p className="rounded-sm bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            Verifique os campos destacados:{" "}
            {Object.entries(state.errors)
              .flatMap(([k, v]) => v.map((msg) => `${k}: ${msg}`))
              .join(" · ")}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Continuar →"}
        </button>
      </form>
    </>
  );
}

function Text({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green"
      />
    </div>
  );
}

function Area({
  label,
  name,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">{label}</label>
      <textarea
        name={name}
        rows={2}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-sm text-forest-green"
      />
    </div>
  );
}
