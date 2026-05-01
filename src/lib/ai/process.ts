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
  ia_disabled?: boolean;
  display_name?: string | null;
  avatar_url?: string | null;
  __created?: boolean;
};

export async function getOrCreateConversation(params: {
  workspaceId: string;
  phone: string;
  pushName?: string | null;
}): Promise<ConversationRow> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("whatsapp_conversations")
    .select("id, workspace_id, phone, ia_active, ia_disabled, display_name, avatar_url")
    .eq("workspace_id", params.workspaceId)
    .eq("phone", params.phone)
    .maybeSingle();

  if (existing) {
    const row = existing as ConversationRow;
    // Atualiza display_name se temos pushName novo e o atual está vazio
    // (ou diferente do que veio agora — o usuário pode ter trocado o nome no WhatsApp).
    if (params.pushName && params.pushName !== row.display_name) {
      await supabase
        .from("whatsapp_conversations")
        .update({ display_name: params.pushName } as never)
        .eq("id", row.id);
      row.display_name = params.pushName;
    }
    return row;
  }

  const { data: created, error } = await supabase
    .from("whatsapp_conversations")
    .insert({
      workspace_id: params.workspaceId,
      phone: params.phone,
      status: "bot",
      ia_active: true,
      last_message_at: new Date().toISOString(),
      display_name: params.pushName ?? null,
    } as never)
    .select("id, workspace_id, phone, ia_active, ia_disabled, display_name, avatar_url")
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
  const { data, error } = await supabase
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
  if (error) {
    console.error("[recordInboundMessage] insert error:", error.message, {
      conversationId: params.conversationId,
      type: params.type,
    });
  }
  const previewSource = params.body?.trim() || previewForType(params.type);
  await supabase
    .from("whatsapp_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_preview: previewSource.slice(0, 120),
    } as never)
    .eq("id", params.conversationId);
  return (data as { id: string } | null)?.id ?? null;
}

function previewForType(type?: string): string {
  switch (type) {
    case "audio":
      return "🎤 Áudio";
    case "image":
      return "📷 Imagem";
    case "document":
      return "📄 Documento";
    case "video":
      return "🎬 Vídeo";
    default:
      return "";
  }
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
