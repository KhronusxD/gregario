"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithHumanDelay } from "@/lib/whatsapp/send";
import { pauseAI, resumeAI } from "@/lib/ai/transfer";

export type WhatsAppFormState = { ok: boolean; message: string | null };

export async function sendOperatorMessageAction(
  _prev: WhatsAppFormState,
  formData: FormData,
): Promise<WhatsAppFormState> {
  const ctx = await requireWorkspace();
  const conversationId = (formData.get("conversationId") as string | null)?.trim();
  const body = (formData.get("body") as string | null)?.trim();

  if (!conversationId || !body) return { ok: false, message: "Mensagem vazia" };

  const supabase = createAdminClient();
  const { data: conv } = await supabase
    .from("whatsapp_conversations")
    .select("id, phone, workspace_id")
    .eq("id", conversationId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  const c = conv as { id: string; phone: string; workspace_id: string } | null;
  if (!c) return { ok: false, message: "Conversa não encontrada" };

  // Persiste ANTES de enviar (proteção contra echo do próprio Evolution)
  await supabase.from("whatsapp_messages").insert({
    workspace_id: ctx.workspace.id,
    conversation_id: c.id,
    from_me: true,
    body,
    type: "text",
    sent_by: "human",
    ai_handled: false,
  } as never);

  await supabase
    .from("whatsapp_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_preview: body.slice(0, 120),
    } as never)
    .eq("id", c.id);

  try {
    await sendWithHumanDelay({
      workspaceId: ctx.workspace.id,
      phone: c.phone,
      text: body,
      conversationId: c.id,
      skipDelay: true,
      skipPersist: true,
      sentBy: "human",
    });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Falha no envio" };
  }

  // Pausa IA conforme setting
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("pause_when_operator_replies, resume_after_escalation_min")
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  const s = settings as { pause_when_operator_replies: boolean; resume_after_escalation_min: number | null } | null;

  if (s?.pause_when_operator_replies) {
    await pauseAI({ conversationId: c.id });
    if (s.resume_after_escalation_min) {
      await supabase
        .from("whatsapp_conversations")
        .update({
          ia_resume_at: new Date(Date.now() + s.resume_after_escalation_min * 60_000).toISOString(),
          handoff_reason: "operador respondeu pelo painel",
          handoff_at: new Date().toISOString(),
        } as never)
        .eq("id", c.id);
    }
  }

  revalidatePath("/dashboard/whatsapp");
  return { ok: true, message: null };
}

export async function takeoverConversationAction(
  _prev: WhatsAppFormState,
  formData: FormData,
): Promise<WhatsAppFormState> {
  const ctx = await requireWorkspace();
  const conversationId = (formData.get("conversationId") as string | null)?.trim();
  if (!conversationId) return { ok: false, message: "ID ausente" };

  await pauseAI({ conversationId });
  const supabase = createAdminClient();
  await supabase
    .from("whatsapp_conversations")
    .update({
      status: "human",
      handoff_reason: "assumido manualmente",
      handoff_at: new Date().toISOString(),
    } as never)
    .eq("id", conversationId)
    .eq("workspace_id", ctx.workspace.id);

  revalidatePath("/dashboard/whatsapp");
  return { ok: true, message: "Você assumiu a conversa." };
}

export async function releaseToAIAction(
  _prev: WhatsAppFormState,
  formData: FormData,
): Promise<WhatsAppFormState> {
  const ctx = await requireWorkspace();
  const conversationId = (formData.get("conversationId") as string | null)?.trim();
  if (!conversationId) return { ok: false, message: "ID ausente" };

  await resumeAI({ conversationId });
  const supabase = createAdminClient();
  await supabase
    .from("whatsapp_conversations")
    .update({
      status: "bot",
      ia_resume_at: null,
      handoff_reason: null,
    } as never)
    .eq("id", conversationId)
    .eq("workspace_id", ctx.workspace.id);

  revalidatePath("/dashboard/whatsapp");
  return { ok: true, message: "IA reassumiu a conversa." };
}
