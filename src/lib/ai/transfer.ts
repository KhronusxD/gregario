import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithHumanDelay } from "@/lib/whatsapp/send";

export async function transferToHuman(params: {
  conversationId: string;
  workspaceId: string;
  phone: string;
  reason: string;
}) {
  const supabase = createAdminClient();

  await supabase
    .from("whatsapp_conversations")
    .update({ status: "human", ia_active: false } as never)
    .eq("id", params.conversationId);

  await sendWithHumanDelay({
    workspaceId: params.workspaceId,
    conversationId: params.conversationId,
    phone: params.phone,
    text: "Vou conectar você com nossa equipe agora. Um momento! 🙏",
  });
}

export async function pauseAI(params: { conversationId: string }) {
  const supabase = createAdminClient();
  await supabase
    .from("whatsapp_conversations")
    .update({ status: "human", ia_active: false } as never)
    .eq("id", params.conversationId);
}
