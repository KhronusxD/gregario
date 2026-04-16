import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type FlowTriggerType =
  | "welcome"
  | "keyword"
  | "first_contact"
  | "member_updated"
  | "event_registered"
  | "manual";

export type FlowNode = {
  id: string;
  type: "trigger" | "send_message" | "wait" | "tag_member" | "transfer_human" | "condition";
  position: { x: number; y: number };
  data: Record<string, unknown>;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

export type Flow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger_type: FlowTriggerType;
  trigger_config: Record<string, unknown>;
  nodes: FlowNode[];
  edges: FlowEdge[];
  created_at: string;
  updated_at: string;
};

export async function listFlows(workspaceId: string): Promise<Flow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_flows")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Flow[];
}

export async function getFlow(id: string, workspaceId: string): Promise<Flow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_flows")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return (data as Flow | null) ?? null;
}

export async function loadActiveFlowsByTrigger(params: {
  workspaceId: string;
  triggerType: FlowTriggerType;
}): Promise<Flow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_flows")
    .select("*")
    .eq("workspace_id", params.workspaceId)
    .eq("trigger_type", params.triggerType)
    .eq("enabled", true);
  return (data ?? []) as Flow[];
}
