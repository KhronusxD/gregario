import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithHumanDelay } from "@/lib/whatsapp/send";
import { pauseAI } from "./transfer";
import { loadActiveFlowsByTrigger, type Flow, type FlowTriggerType, type FlowNode, type FlowEdge } from "./flows";

type ExecContext = {
  workspaceId: string;
  conversationId?: string;
  phone?: string;
  memberId?: string | null;
  variables: Record<string, unknown>;
};

const MAX_NODES_PER_FLOW = 30;
const MAX_WAIT_SECONDS = 300;

function firstName(name?: string | null): string {
  if (!name) return "amigo";
  return name.trim().split(/\s+/)[0] ?? "amigo";
}

function interpolate(text: string, ctx: ExecContext): string {
  const member = (ctx.variables.member ?? {}) as { name?: string | null };
  return text.replace(/\{nome\}/g, firstName(member.name));
}

function findStartNode(flow: Flow): FlowNode | null {
  return flow.nodes.find((n) => n.type === "trigger") ?? flow.nodes[0] ?? null;
}

function nextNodes(edges: FlowEdge[], fromId: string): string[] {
  return edges.filter((e) => e.source === fromId).map((e) => e.target);
}

async function runNode(node: FlowNode, flow: Flow, ctx: ExecContext): Promise<void> {
  const kind = String((node.data as { kind?: string })?.kind ?? node.type);
  switch (kind) {
    case "send_message": {
      const text = String((node.data as { text?: string })?.text ?? "");
      if (text && ctx.phone) {
        await sendWithHumanDelay({
          workspaceId: ctx.workspaceId,
          conversationId: ctx.conversationId,
          phone: ctx.phone,
          text: interpolate(text, ctx),
          sentBy: "ia",
        });
      }
      break;
    }
    case "wait": {
      const seconds = Math.min(Number((node.data as { seconds?: number })?.seconds ?? 0), MAX_WAIT_SECONDS);
      if (seconds > 0) await new Promise((r) => setTimeout(r, seconds * 1000));
      break;
    }
    case "tag_member": {
      const tag = String((node.data as { tag?: string })?.tag ?? "").trim();
      if (tag && ctx.memberId) {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("members")
          .select("tags")
          .eq("id", ctx.memberId)
          .maybeSingle();
        const existing = ((data as { tags?: string[] } | null)?.tags ?? []) as string[];
        if (!existing.includes(tag)) {
          await supabase
            .from("members")
            .update({ tags: [...existing, tag] } as never)
            .eq("id", ctx.memberId);
        }
      }
      break;
    }
    case "transfer_human": {
      if (ctx.conversationId) {
        const supabase = createAdminClient();
        await pauseAI({ conversationId: ctx.conversationId });
        await supabase
          .from("whatsapp_conversations")
          .update({
            handoff_reason: String((node.data as { reason?: string })?.reason ?? "fluxo transferiu"),
            handoff_at: new Date().toISOString(),
          } as never)
          .eq("id", ctx.conversationId);
      }
      break;
    }
    case "condition":
      // Condições são avaliadas nas arestas (source handle). Sem lógica aqui; handler de next escolhe.
      break;
    case "trigger":
    default:
      break;
  }
}

export async function runFlow(params: { flow: Flow; ctx: ExecContext }): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: execRow } = await supabase
    .from("ai_flow_executions")
    .insert({
      flow_id: params.flow.id,
      workspace_id: params.flow.workspace_id,
      conversation_id: params.ctx.conversationId ?? null,
      member_id: params.ctx.memberId ?? null,
      status: "running",
    } as never)
    .select("id")
    .single();
  const execId = (execRow as { id: string } | null)?.id;

  try {
    const start = findStartNode(params.flow);
    if (!start) return { ok: true };

    const visited = new Set<string>();
    let frontier = [start.id];
    let steps = 0;
    while (frontier.length > 0 && steps < MAX_NODES_PER_FLOW) {
      const nextFrontier: string[] = [];
      for (const id of frontier) {
        if (visited.has(id)) continue;
        visited.add(id);
        const node = params.flow.nodes.find((n) => n.id === id);
        if (!node) continue;
        await runNode(node, params.flow, params.ctx);
        nextFrontier.push(...nextNodes(params.flow.edges, id));
        steps++;
      }
      frontier = nextFrontier;
    }

    if (execId) {
      await supabase
        .from("ai_flow_executions")
        .update({ status: "done" } as never)
        .eq("id", execId);
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (execId) {
      await supabase
        .from("ai_flow_executions")
        .update({ status: "error", error: msg } as never)
        .eq("id", execId);
    }
    return { ok: false, error: msg };
  }
}

export async function triggerFlows(params: {
  workspaceId: string;
  triggerType: FlowTriggerType;
  conversationId?: string;
  phone?: string;
  memberId?: string | null;
  variables?: Record<string, unknown>;
  messageText?: string; // pra matching de keyword
}): Promise<void> {
  const flows = await loadActiveFlowsByTrigger({
    workspaceId: params.workspaceId,
    triggerType: params.triggerType,
  });
  if (flows.length === 0) return;

  for (const flow of flows) {
    if (flow.trigger_type === "keyword") {
      const keyword = String((flow.trigger_config as { keyword?: string })?.keyword ?? "")
        .trim()
        .toLowerCase();
      const text = (params.messageText ?? "").toLowerCase();
      if (!keyword || !text.includes(keyword)) continue;
    }
    if (flow.trigger_type === "first_contact") {
      if (!params.conversationId) continue;
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("ai_flow_executions")
        .select("id")
        .eq("flow_id", flow.id)
        .eq("conversation_id", params.conversationId)
        .limit(1);
      if ((data?.length ?? 0) > 0) continue;
    }

    await runFlow({
      flow,
      ctx: {
        workspaceId: params.workspaceId,
        conversationId: params.conversationId,
        phone: params.phone,
        memberId: params.memberId ?? null,
        variables: params.variables ?? {},
      },
    });
  }
}
