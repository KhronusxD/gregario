import Link from "next/link";
import { requireWorkspace } from "@/lib/auth/dal";

export default async function SettingsPage() {
  const ctx = await requireWorkspace();
  const trialEnd = ctx.workspace.trial_ends_at
    ? new Date(ctx.workspace.trial_ends_at).toLocaleDateString("pt-BR")
    : "—";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card title="Igreja">
        <Row k="Nome" v={ctx.workspace.name} />
        <Row k="Slug (link do app)" v={`/${ctx.workspace.slug}`} />
        <Row k="Denominação" v={ctx.workspace.denomination ?? "—"} />
      </Card>
      <Card title="Plano">
        <Row k="Plano" v={ctx.workspace.plan ?? "essencial"} />
        <Row k="Status" v={ctx.workspace.plan_status ?? "—"} />
        <Row k="Fim do trial" v={trialEnd} />
        <Link
          href="/dashboard/billing"
          className="mt-4 inline-block rounded-full bg-forest-green/[0.06] px-4 py-2 font-display text-xs font-bold text-forest-green hover:bg-forest-green/[0.1]"
        >
          Gerenciar assinatura
        </Link>
      </Card>
      <Card title="Equipe">
        <p className="font-sans text-sm text-forest-green/70">
          Convide pastores, secretaria, tesoureiro e líderes. Em breve aqui.
        </p>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-card p-6 shadow-card">
      <h3 className="mb-4 font-display text-base font-bold text-forest-green">{title}</h3>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-t border-forest-green/5 py-2 font-sans text-sm first:border-t-0">
      <span className="text-forest-green/60">{k}</span>
      <span className="font-display font-bold text-forest-green">{v}</span>
    </div>
  );
}
