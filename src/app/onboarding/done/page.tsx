import { requireWorkspace } from "@/lib/auth/dal";
import { finishOnboarding } from "@/actions/onboarding";
import { Stepper } from "@/components/onboarding/Stepper";

export default async function OnboardingDoneStep() {
  const ctx = await requireWorkspace();
  const appUrl = `/${ctx.workspace.slug}`;

  return (
    <>
      <Stepper current={5} />
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-forest-green">Tudo pronto!</h1>
        <p className="mt-2 font-sans text-sm text-forest-green/70">
          Compartilhe o link do app com os membros da <span className="font-bold">{ctx.workspace.name}</span>.
        </p>
      </header>

      <div className="space-y-6 rounded-lg bg-card p-8 shadow-card">
        <div className="rounded-sm bg-surface p-6">
          <p className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
            Link do app do membro
          </p>
          <p className="mt-2 break-all font-mono text-sm font-bold text-forest-green">
            {appUrl}
          </p>
          <p className="mt-2 font-sans text-xs text-forest-green/60">
            Cole este link no perfil da igreja, grupos de WhatsApp e avisos do culto.
          </p>
        </div>

        <div className="grid gap-4 rounded-sm border border-forest-green/10 bg-surface p-6 md:grid-cols-[auto_1fr]">
          <div className="flex h-28 w-28 items-center justify-center rounded-sm bg-card">
            <span className="font-mono text-[10px] text-forest-green/40">QR</span>
          </div>
          <div>
            <p className="font-display text-sm font-bold text-forest-green">QR Code do app</p>
            <p className="mt-1 font-sans text-xs text-forest-green/60">
              Em breve geramos um QR imprimível para o mural e o boletim da igreja.
            </p>
          </div>
        </div>

        <div className="rounded-sm bg-accent-green/10 p-4 font-sans text-sm text-forest-green/80">
          <p className="font-bold text-forest-green">Próximos passos sugeridos</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Importar a lista completa de membros em Secretaria → Membros.</li>
            <li>Criar o primeiro evento e divulgar no app.</li>
            <li>Testar a secretaria IA enviando uma pergunta do FAQ pelo WhatsApp.</li>
          </ul>
        </div>

        <form action={finishOnboarding} className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card active:scale-95"
          >
            Ir para o dashboard →
          </button>
        </form>
      </div>
    </>
  );
}
