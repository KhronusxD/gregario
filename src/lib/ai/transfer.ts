import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithHumanDelay } from "@/lib/whatsapp/send";
import { notifyHandoff } from "./notify";

/**
 * Pausa a IA na conversa. Se workspaceId for passado, aplica o timer
 * de "retornar IA após X minutos" lendo de ai_settings — assim TODOS
 * os caminhos de handoff respeitam a setting (manual takeover, transfer
 * pastoral, limite de mensagens, etc.).
 *
 * Sem workspaceId, só pausa (compat com chamadas legadas que ainda
 * gravam ia_resume_at separadamente).
 */
export async function pauseAI(params: {
  conversationId: string;
  workspaceId?: string;
  reason?: string;
}) {
  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {
    status: "human",
    ia_active: false,
  };
  if (params.reason) {
    updates.handoff_reason = params.reason;
    updates.handoff_at = new Date().toISOString();
  }
  if (params.workspaceId) {
    const { data } = await supabase
      .from("ai_settings")
      .select("resume_after_escalation_min")
      .eq("workspace_id", params.workspaceId)
      .maybeSingle();
    const min = (data as { resume_after_escalation_min: number | null } | null)
      ?.resume_after_escalation_min;
    if (min && min > 0) {
      updates.ia_resume_at = new Date(Date.now() + min * 60_000).toISOString();
    } else {
      // Setting vazia/0 = nunca retorna automaticamente — limpa qualquer timer
      // residual de pausa anterior pra não confundir o checker.
      updates.ia_resume_at = null;
    }
  }
  await supabase
    .from("whatsapp_conversations")
    .update(updates as never)
    .eq("id", params.conversationId);
}

export async function transferToHuman(params: {
  conversationId: string;
  workspaceId: string;
  phone: string;
  reason: string;
}) {
  await pauseAI({
    conversationId: params.conversationId,
    workspaceId: params.workspaceId,
    reason: params.reason,
  });

  await sendWithHumanDelay({
    workspaceId: params.workspaceId,
    conversationId: params.conversationId,
    phone: params.phone,
    text: "Vou conectar você com nossa equipe agora. Um momento! 🙏",
  });

  await notifyHandoff({
    workspaceId: params.workspaceId,
    conversationId: params.conversationId,
    reason: params.reason,
  });
}

export async function resumeAI(params: { conversationId: string }) {
  const supabase = createAdminClient();
  await supabase
    .from("whatsapp_conversations")
    .update({ status: "bot", ia_active: true, ia_resume_at: null } as never)
    .eq("id", params.conversationId);
}
