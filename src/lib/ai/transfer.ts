import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithHumanDelay } from "@/lib/whatsapp/send";
import { notifyHandoff } from "./notify";

export async function transferToHuman(params: {
  conversationId: string;
  workspaceId: string;
  phone: string;
  reason: string;
}) {
  const supabase = createAdminClient();

  await supabase
    .from("whatsapp_conversations")
    .update({
      status: "human",
      ia_active: false,
      handoff_reason: params.reason,
      handoff_at: new Date().toISOString(),
    } as never)
    .eq("id", params.conversationId);

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

export async function pauseAI(params: { conversationId: string }) {
  const supabase = createAdminClient();
  await supabase
    .from("whatsapp_conversations")
    .update({ status: "human", ia_active: false } as never)
    .eq("id", params.conversationId);
}

export async function resumeAI(params: { conversationId: string }) {
  const supabase = createAdminClient();
  await supabase
    .from("whatsapp_conversations")
    .update({ status: "bot", ia_active: true } as never)
    .eq("id", params.conversationId);
}
