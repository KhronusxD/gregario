"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export type FlowFormState = { ok: boolean; message: string | null };

const TRIGGER_TYPES = [
  "welcome",
  "keyword",
  "first_contact",
  "member_updated",
  "event_registered",
  "manual",
] as const;

const CreateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  trigger_type: z.enum(TRIGGER_TYPES),
});

export async function createFlowAction(
  _prev: FlowFormState,
  formData: FormData,
): Promise<FlowFormState> {
  const ctx = await requireWorkspace();
  const parsed = CreateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    trigger_type: formData.get("trigger_type"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ai_flows")
    .insert({
      workspace_id: ctx.workspace.id,
      name: parsed.data.name,
      description: parsed.data.description,
      trigger_type: parsed.data.trigger_type,
      trigger_config: {},
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 50, y: 100 },
          data: { triggerType: parsed.data.trigger_type, label: "Gatilho" },
        },
      ],
      edges: [],
      enabled: false,
    } as never)
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: error?.message ?? "Falha ao criar" };
  revalidatePath("/dashboard/ai/flows");
  redirect(`/dashboard/ai/flows/${(data as { id: string }).id}`);
}

const SaveSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  enabled: z.boolean(),
  trigger_type: z.enum(TRIGGER_TYPES),
  trigger_config: z.record(z.string(), z.unknown()),
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
});

export async function saveFlowAction(payload: unknown): Promise<FlowFormState> {
  const ctx = await requireWorkspace();
  const parsed = SaveSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { id, ...rest } = parsed.data;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ai_flows")
    .update(rest as never)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/dashboard/ai/flows/${id}`);
  revalidatePath("/dashboard/ai/flows");
  return { ok: true, message: "Salvo" };
}

export async function toggleFlowAction(
  _prev: FlowFormState,
  formData: FormData,
): Promise<FlowFormState> {
  const ctx = await requireWorkspace();
  const id = formData.get("id") as string | null;
  const enabled = formData.get("enabled") === "true";
  if (!id) return { ok: false, message: "ID inválido" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ai_flows")
    .update({ enabled } as never)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/ai/flows");
  return { ok: true, message: null };
}

export async function deleteFlowAction(
  _prev: FlowFormState,
  formData: FormData,
): Promise<FlowFormState> {
  const ctx = await requireWorkspace();
  const id = formData.get("id") as string | null;
  if (!id) return { ok: false, message: "ID inválido" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ai_flows")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/ai/flows");
  return { ok: true, message: "Fluxo removido" };
}
