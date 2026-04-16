import { requireWorkspace } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/PageHeader";
import { PLAN_CATALOG } from "@/lib/stripe/plans";
import { startCheckoutAction, openPortalAction } from "@/actions/billing";

type WorkspaceBilling = {
  plan: string;
  plan_status: "trial" | "active" | "past_due" | "canceled";
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

function daysUntil(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const ms = new Date(dateIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  const ctx = await requireWorkspace();
  const params = await searchParams;

  const supabase = createAdminClient();
  const { data: ws } = await supabase
    .from("workspaces")
    .select(
      "plan, plan_status, trial_ends_at, stripe_customer_id, stripe_subscription_id",
    )
    .eq("id", ctx.workspace.id)
    .maybeSingle();
  const workspace = ws as WorkspaceBilling | null;
  if (!workspace) return null;

  const trialDays = daysUntil(workspace.trial_ends_at);
  const isTrial = workspace.plan_status === "trial";
  const isActive = workspace.plan_status === "active";
  const isPastDue = workspace.plan_status === "past_due";
  const isCanceled = workspace.plan_status === "canceled";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinatura"
        description="Escolha o plano ideal para o tamanho da sua igreja."
      />

      {params.success ? (
        <div className="rounded-lg bg-accent-green/20 px-4 py-3 font-sans text-sm text-forest-green">
          Pagamento registrado! Pode levar alguns instantes para o status atualizar.
        </div>
      ) : null}
      {params.cancelled ? (
        <div className="rounded-lg bg-forest-green/[0.06] px-4 py-3 font-sans text-sm text-forest-green/80">
          Checkout cancelado — você pode tentar novamente quando quiser.
        </div>
      ) : null}

      {isTrial && trialDays !== null ? (
        <div className="rounded-lg bg-card p-5 shadow-card">
          <p className="font-display text-sm font-bold text-forest-green">
            Você está em período de teste — {trialDays} {trialDays === 1 ? "dia restante" : "dias restantes"}
          </p>
          <p className="mt-1 font-sans text-xs text-forest-green/70">
            Adicione um método de pagamento antes do fim do período para não interromper o serviço.
          </p>
        </div>
      ) : null}

      {isPastDue ? (
        <div className="rounded-lg bg-red-50 p-5">
          <p className="font-display text-sm font-bold text-red-700">Pagamento pendente</p>
          <p className="mt-1 font-sans text-xs text-red-700/80">
            Regularize o pagamento para reativar recursos premium.
          </p>
          <form action={openPortalAction} className="mt-3">
            <button className="rounded-full bg-red-700 px-5 py-2 font-display text-xs font-bold text-card">
              Regularizar pagamento
            </button>
          </form>
        </div>
      ) : null}

      {isCanceled ? (
        <div className="rounded-lg bg-card p-5 shadow-card">
          <p className="font-display text-sm font-bold text-forest-green">Assinatura cancelada</p>
          <p className="mt-1 font-sans text-xs text-forest-green/70">
            Reative escolhendo um dos planos abaixo.
          </p>
        </div>
      ) : null}

      {isActive && workspace.stripe_customer_id ? (
        <div className="flex items-center justify-between rounded-lg bg-card p-5 shadow-card">
          <div>
            <p className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
              Plano atual
            </p>
            <p className="mt-1 font-display text-lg font-extrabold text-forest-green">
              {workspace.plan.charAt(0).toUpperCase() + workspace.plan.slice(1)}
            </p>
          </div>
          <form action={openPortalAction}>
            <button className="rounded-full bg-forest-green/[0.06] px-5 py-2 font-display text-xs font-bold text-forest-green">
              Gerenciar assinatura
            </button>
          </form>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_CATALOG.map((plan) => {
          const isCurrent = isActive && workspace.plan === plan.id;
          return (
            <article
              key={plan.id}
              className={`flex flex-col rounded-lg bg-card p-6 shadow-card ${
                plan.highlight ? "ring-2 ring-accent-green" : ""
              }`}
            >
              {plan.highlight ? (
                <span className="mb-3 inline-block w-fit rounded-full bg-accent-green/20 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green">
                  Mais popular
                </span>
              ) : null}
              <p className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
                {plan.tagline}
              </p>
              <h3 className="mt-2 font-display text-xl font-extrabold text-forest-green">
                {plan.name}
              </h3>
              <p className="mt-2 font-display text-3xl font-extrabold text-forest-green">
                R$ {plan.priceBRL}
                <span className="font-sans text-sm font-normal text-forest-green/60">/mês</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 font-sans text-sm text-forest-green/80">
                {plan.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-0.5 text-accent-green">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <form action={startCheckoutAction} className="mt-6">
                <input type="hidden" name="plan" value={plan.id} />
                <button
                  type="submit"
                  disabled={isCurrent}
                  className={`w-full rounded-full px-5 py-3 font-display text-sm font-bold active:scale-95 disabled:opacity-60 ${
                    plan.highlight
                      ? "bg-gradient-to-br from-forest-green to-action-green text-card"
                      : "bg-forest-green/[0.06] text-forest-green hover:bg-forest-green/[0.1]"
                  }`}
                >
                  {isCurrent ? "Plano atual" : isTrial || isCanceled ? "Assinar" : "Mudar plano"}
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </div>
  );
}
