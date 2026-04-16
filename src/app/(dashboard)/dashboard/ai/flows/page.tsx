import { requireWorkspace } from "@/lib/auth/dal";
import { listFlows } from "@/lib/ai/flows";
import { CreateFlowForm } from "@/components/ai/CreateFlowForm";
import { FlowListItem } from "@/components/ai/FlowListItem";

export default async function AIFlowsPage() {
  const ctx = await requireWorkspace();
  const flows = await listFlows(ctx.workspace.id);

  return (
    <div className="space-y-6">
      <CreateFlowForm />

      <div className="rounded-lg bg-card shadow-card">
        <div className="border-b border-forest-green/5 p-4">
          <p className="font-display text-sm font-bold text-forest-green">Fluxos criados</p>
          <p className="mt-1 font-sans text-xs text-forest-green/60">
            Fluxos ativos disparam automaticamente quando o gatilho acontece.
          </p>
        </div>
        {flows.length === 0 ? (
          <p className="p-6 text-center font-sans text-sm text-forest-green/50">
            Nenhum fluxo criado ainda.
          </p>
        ) : (
          <div>
            {flows.map((f) => (
              <FlowListItem key={f.id} flow={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
