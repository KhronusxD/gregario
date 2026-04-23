import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getFlow } from "@/lib/ai/flows";
import { FlowEditor } from "@/components/ai/FlowEditor";
import { FlowExecutions } from "@/components/ai/FlowExecutions";

export default async function FlowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const flow = await getFlow(id, ctx.workspace.id);
  if (!flow) notFound();

  const supabase = await createClient();
  const { data: execRows } = await supabase
    .from("ai_flow_executions")
    .select("id, status, error, created_at")
    .eq("flow_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const executions = (execRows ?? []) as Array<{
    id: string;
    status: "running" | "done" | "error";
    error: string | null;
    created_at: string;
  }>;

  return (
    <div className="space-y-6">
      <FlowEditor flow={flow} />
      <FlowExecutions items={executions} />
    </div>
  );
}
