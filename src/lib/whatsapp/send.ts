import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMetaText } from "./meta";
import { sendWhatsAppText as sendEvolutionText } from "./evolution";
import { sleep } from "./normalize";

type WorkspaceRow = {
  id: string;
  name: string;
  evolution_instance: string | null;
  meta_phone_number_id: string | null;
};

async function getWorkspace(workspaceId: string): Promise<WorkspaceRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("workspaces")
    .select("id, name, evolution_instance, meta_phone_number_id")
    .eq("id", workspaceId)
    .maybeSingle();
  return (data as WorkspaceRow | null) ?? null;
}

export async function sendWithHumanDelay(params: {
  workspaceId: string;
  phone: string;
  text: string;
  conversationId?: string;
  skipDelay?: boolean;
  skipPersist?: boolean;
  sentBy?: "ia" | "human" | "system";
}) {
  const workspace = await getWorkspace(params.workspaceId);
  if (!workspace) return;

  // Sem gating de horário aqui — decisão de "responder ou não" pertence
  // ao webhook (isWithinBusinessHours). Send é puramente técnico: se
  // chegou aqui, manda. Bloquear no envio quebra inclusive resposta
  // manual do operador fora do horário.

  if (!params.skipDelay) {
    const jitter = 3000 + Math.random() * 9000;
    await sleep(jitter);
    const typingMs = Math.min(params.text.length * 50, 3000);
    await sleep(typingMs);
  }

  const metaToken = process.env.META_WHATSAPP_TOKEN;
  if (workspace.meta_phone_number_id && metaToken) {
    await sendMetaText({
      phoneNumberId: workspace.meta_phone_number_id,
      token: metaToken,
      to: params.phone,
      text: params.text,
    });
  } else if (workspace.evolution_instance) {
    await sendEvolutionText({
      instanceName: workspace.evolution_instance,
      phone: params.phone,
      text: params.text,
    });
  } else {
    throw new Error("Nenhum canal WhatsApp configurado para este workspace");
  }

  if (params.skipPersist) return;

  const supabase = createAdminClient();
  await supabase.from("whatsapp_messages").insert({
    workspace_id: params.workspaceId,
    conversation_id: params.conversationId ?? null,
    from_me: true,
    body: params.text,
    type: "text",
    sent_by: params.sentBy ?? "ia",
    ai_handled: (params.sentBy ?? "ia") === "ia",
  } as never);
}
