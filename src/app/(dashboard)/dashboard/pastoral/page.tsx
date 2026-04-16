import { PageHeader, EmptyState } from "@/components/admin/PageHeader";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/members";

export default async function PastoralPage() {
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("pastoral_alerts")
    .select("id, risk_score, reason, suggestion, status, created_at, member:member_id(id, name)")
    .eq("workspace_id", ctx.workspace.id)
    .eq("status", "open")
    .order("risk_score", { ascending: false })
    .limit(20);
  const alerts = (data ?? []) as Array<{
    id: string;
    risk_score: number;
    reason: string;
    suggestion: string | null;
    status: string;
    created_at: string;
    member: { id: string; name: string } | { id: string; name: string }[] | null;
  }>;

  return (
    <main className="ml-64 max-w-[1400px] p-10">
      <PageHeader
        eyebrow="IA"
        title="Pastoreio"
        description="Alertas gerados semanalmente pela análise de engajamento e contribuição. Ative em Fase 2."
      />

      {alerts.length === 0 ? (
        <EmptyState
          title="Nenhum alerta aberto"
          description="A IA de pastoreio começa a rodar após 30 dias de dados. Enquanto isso, acompanhe manualmente pela secretaria."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {alerts.map((a) => {
            const member = Array.isArray(a.member) ? a.member[0] : a.member;
            return (
              <article key={a.id} className="rounded-lg bg-card p-6 shadow-card">
                <header className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-action-green to-forest-green font-display text-sm text-card">
                      {initials(member?.name)}
                    </span>
                    <div>
                      <p className="font-display text-base font-bold text-forest-green">{member?.name ?? "—"}</p>
                      <p className="font-sans text-xs text-forest-green/60">Risk score: {a.risk_score.toFixed(2)}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-forest-green px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-card">
                    Alta prioridade
                  </span>
                </header>
                <p className="mb-3 font-sans text-sm text-forest-green/80">
                  <span className="font-bold">Sinal: </span>
                  {a.reason}
                </p>
                {a.suggestion ? (
                  <p className="rounded-sm bg-forest-green/[0.04] px-4 py-3 font-sans text-sm text-forest-green/80">
                    <span className="font-bold">Sugestão: </span>
                    {a.suggestion}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
