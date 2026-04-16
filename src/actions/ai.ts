"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const SettingsSchema = z.object({
  assistant_name: z.string().max(60).optional().nullable(),
  show_assistant_name: z.boolean().optional(),
  system_prompt: z.string().max(6000).optional().nullable(),
  tone: z.enum(["formal", "profissional", "acolhedor", "amigavel", "pastoral"]).optional(),
  autonomy: z.enum(["supervisionado", "semi_autonomo", "autonomo"]).optional(),
  max_messages_per_conversation: z.coerce.number().int().min(0).max(500).optional(),
  escalate_if_no_reply_min: z.coerce.number().int().min(0).max(1440).optional(),
  reply_outside_hours: z.boolean().optional(),
  pause_when_operator_replies: z.boolean().optional(),
  pause_when_human_on_mobile: z.boolean().optional(),
  resume_after_escalation_min: z.coerce.number().int().min(0).max(1440).optional().nullable(),
  negative_rules: z.array(z.string()).optional(),
  auto_enable_for_new_contacts: z.boolean().optional(),
  debounce_seconds: z.coerce.number().int().min(5).max(30).optional(),
});

export type AIConfigFormState = { ok: boolean; message: string | null };

export async function toggleAIActive(_prev: AIConfigFormState, formData: FormData): Promise<AIConfigFormState> {
  const ctx = await requireWorkspace();
  const nextActive = formData.get("active") === "true";
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ ia_active: nextActive } as never)
    .eq("id", ctx.workspace.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/ai/config");
  return { ok: true, message: nextActive ? "IA ativada" : "IA desativada" };
}

export async function saveAISettings(_prev: AIConfigFormState, formData: FormData): Promise<AIConfigFormState> {
  const ctx = await requireWorkspace();
  const raw = {
    assistant_name: (formData.get("assistant_name") as string | null) || null,
    show_assistant_name: formData.get("show_assistant_name") === "on",
    system_prompt: (formData.get("system_prompt") as string | null) || null,
    tone: formData.get("tone") as string | null,
    autonomy: formData.get("autonomy") as string | null,
    max_messages_per_conversation: formData.get("max_messages_per_conversation") ?? 0,
    escalate_if_no_reply_min: formData.get("escalate_if_no_reply_min") ?? 0,
    reply_outside_hours: formData.get("reply_outside_hours") === "on",
    pause_when_operator_replies: formData.get("pause_when_operator_replies") === "on",
    pause_when_human_on_mobile: formData.get("pause_when_human_on_mobile") === "on",
    resume_after_escalation_min: formData.get("resume_after_escalation_min") || null,
    negative_rules: ((formData.get("negative_rules") as string) ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
    auto_enable_for_new_contacts: formData.get("auto_enable_for_new_contacts") === "on",
    debounce_seconds: formData.get("debounce_seconds") ?? 8,
  };

  const parsed = SettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ai_settings")
    .upsert({ workspace_id: ctx.workspace.id, ...parsed.data } as never, { onConflict: "workspace_id" });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/ai/config");
  return { ok: true, message: "Configurações salvas" };
}
