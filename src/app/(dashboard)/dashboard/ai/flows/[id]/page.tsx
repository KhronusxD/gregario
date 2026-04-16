import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/auth/dal";
import { getFlow } from "@/lib/ai/flows";
import { FlowEditor } from "@/components/ai/FlowEditor";

export default async function FlowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const flow = await getFlow(id, ctx.workspace.id);
  if (!flow) notFound();

  return <FlowEditor flow={flow} />;
}
