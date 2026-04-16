"use client";

import { useActionState } from "react";
import { connectWhatsappStep, skipWhatsappStep, type OnboardingState } from "@/actions/onboarding";
import { Stepper } from "@/components/onboarding/Stepper";

export default function WhatsAppConnectStep() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    async () => connectWhatsappStep(),
    undefined,
  );

  return (
    <>
      <Stepper current={3} />
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-forest-green">Conectar WhatsApp</h1>
        <p className="mt-2 font-sans text-sm text-forest-green/70">
          Crie uma instância Evolution para a igreja. Depois escaneie o QR Code no seu WhatsApp Web.
        </p>
      </header>

      <div className="space-y-4 rounded-lg bg-card p-8 shadow-card">
        <div className="rounded-sm bg-surface p-4 font-sans text-sm text-forest-green/80">
          <p className="font-bold">Como funciona</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-forest-green/70">
            <li>Clique em Gerar instância — criamos o canal no servidor Evolution.</li>
            <li>Em seguida, a igreja escaneia o QR Code no celular.</li>
            <li>A IA passa a responder automaticamente segundo o FAQ configurado.</li>
          </ol>
        </div>

        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
          >
            {pending ? "Gerando..." : "Gerar instância"}
          </button>
        </form>

        {state?.message ? (
          <p
            className={`rounded-sm px-3 py-2 font-sans text-sm ${
              state.ok ? "bg-accent-green/20 text-forest-green" : "bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </div>

      <form action={skipWhatsappStep} className="mt-6 text-right">
        <button className="font-sans text-xs font-bold text-forest-green/60 hover:text-forest-green">
          Pular e conectar depois →
        </button>
      </form>
    </>
  );
}
