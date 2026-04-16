import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyIntent } from "@/lib/ai/classify";
import { handleFAQ } from "@/lib/ai/handlers/faq";
import { handleRegistration } from "@/lib/ai/handlers/registration";
import { handleProfileUpdate } from "@/lib/ai/handlers/profile";
import { transferToHuman } from "@/lib/ai/transfer";

type ConversationRow = {
  id: string;
  workspace_id: string;
  phone: string;
  ia_active: boolean;
  __created?: boolean;
};

export async function getOrCreateConversation(params: {
  workspaceId: string;
  phone: string;
}): Promise<ConversationRow> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("whatsapp_conversations")
    .select("id, workspace_id, phone, ia_active")
    .eq("workspace_id", params.workspaceId)
    .eq("phone", params.phone)
    .maybeSingle();

  if (existing) return existing as ConversationRow;

  const { data: created, error } = await supabase
    .from("whatsapp_conversations")
    .insert({
      workspace_id: params.workspaceId,
      phone: params.phone,
      status: "bot",
      ia_active: true,
      last_message_at: new Date().toISOString(),
    } as never)
    .select("id, workspace_id, phone, ia_active")
    .single();

  if (error || !created) throw new Error(`createConversation failed: ${error?.message}`);
  return { ...(created as ConversationRow), __created: true };
}

export async function recordInboundMessage(params: {
  workspaceId: string;
  conversationId: string;
  body: string;
  type?: string;
  mediaUrl?: string;
  mediaType?: string;
  whatsappMsgId?: string;
}): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("whatsapp_messages")
    .insert({
      workspace_id: params.workspaceId,
      conversation_id: params.conversationId,
      from_me: false,
      body: params.body,
      type: params.type ?? "text",
      sent_by: "member",
      media_url: params.mediaUrl ?? null,
      media_type: params.mediaType ?? null,
      whatsapp_msg_id: params.whatsappMsgId ?? null,
    } as never)
    .select("id")
    .single();
  await supabase
    .from("whatsapp_conversations")
    .update({ last_message_at: new Date().toISOString() } as never)
    .eq("id", params.conversationId);
  return (data as { id: string } | null)?.id ?? null;
}

export async function processConversation(params: {
  workspaceId: string;
  conversationId: string;
  phone: string;
}) {
  const supabase = createAdminClient();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", params.workspaceId)
    .maybeSingle();

  const { data: recent } = await supabase
    .from("whatsapp_messages")
    .select("from_me, body")
    .eq("conversation_id", params.conversationId)
    .order("created_at", { ascending: false })
    .limit(10);

  const messages = ((recent ?? []) as Array<{ from_me: boolean; body: string }>)
    .reverse()
    .filter((m) => m.body);

  if (messages.length === 0) return;

  const classification = await classifyIntent({
    workspaceName: (ws as { name?: string } | null)?.name ?? "igreja",
    messages,
  });

  const lastUser = [...messages].reverse().find((m) => !m.from_me);
  const question = lastUser?.body ?? "";

  await supabase
    .from("whatsapp_messages")
    .update({ intent: classification.intent } as never)
    .eq("conversation_id", params.conversationId)
    .eq("from_me", false)
    .eq("body", question);

  switch (classification.intent) {
    case "faq":
      await handleFAQ({
        workspaceId: params.workspaceId,
        conversationId: params.conversationId,
        phone: params.phone,
        question,
      });
      break;
    case "inscricao":
      await handleRegistration({
        workspaceId: params.workspaceId,
        conversationId: params.conversationId,
        phone: params.phone,
        eventName: classification.entities.event_name,
      });
      break;
    case "cadastro":
      await handleProfileUpdate({
        workspaceId: params.workspaceId,
        conversationId: params.conversationId,
        phone: params.phone,
        field: classification.entities.field_to_update,
        value: classification.entities.new_value,
      });
      break;
    case "pastoral":
    default:
      await transferToHuman({
        conversationId: params.conversationId,
        workspaceId: params.workspaceId,
        phone: params.phone,
        reason: classification.reason ?? "Assunto requer atendimento humano",
      });
  }
}
