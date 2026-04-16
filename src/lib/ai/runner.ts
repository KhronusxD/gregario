import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithHumanDelay } from "@/lib/whatsapp/send";

/**
 * Wrapper thin sobre o agent.ts (Fase 2). Na Fase 1, delega pro process.ts legacy
 * enquanto o motor ag\u00eantico novo n\u00e3o chega. O cron + o webhook usam esse entry-point.
 */
export async function runAgentOnQueue(params: {
  workspaceId: string;
  conversationId: string;
  phone: string;
  combinedMessage: string;
}): Promise<void> {
  const { runAgent } = await import("./agent");
  const reply = await runAgent({
    workspaceId: params.workspaceId,
    conversationId: params.conversationId,
    phone: params.phone,
    message: params.combinedMessage,
  });
  if (!reply) return;

  const supabase = createAdminClient();
  // SAVE-BEFORE-SEND: salva no DB antes de enviar pro WhatsApp. Isso impede que o
  // webhook de echo detection confunda a pr\u00f3pria resposta com mensagem humana nova.
  await supabase.from("whatsapp_messages").insert({
    workspace_id: params.workspaceId,
    conversation_id: params.conversationId,
    from_me: true,
    body: reply,
    type: "text",
    sent_by: "ia",
    ai_handled: true,
  } as never);

  await supabase
    .from("whatsapp_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_preview: reply.slice(0, 120),
      ia_last_action_at: new Date().toISOString(),
    } as never)
    .eq("id", params.conversationId);

  await sendWithHumanDelay({
    workspaceId: params.workspaceId,
    phone: params.phone,
    text: reply,
    conversationId: params.conversationId,
    skipPersist: true,
  });
}
