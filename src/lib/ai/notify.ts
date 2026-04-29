import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/whatsapp/evolution";

type Result = { ok: boolean; message?: string };

/**
 * Envio bruto pro número configurado em ai_settings.notify_phone via
 * a instância Evolution do workspace. Não persiste em whatsapp_messages
 * (é alerta operacional, não conversa).
 */
export async function sendNotification(workspaceId: string, text: string): Promise<Result> {
  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("notify_active, notify_phone")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const s = settings as { notify_active: boolean; notify_phone: string | null } | null;
  if (!s?.notify_active) return { ok: false, message: "Notificações desativadas" };
  if (!s.notify_phone) return { ok: false, message: "Número não configurado" };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("evolution_instance")
    .eq("id", workspaceId)
    .maybeSingle();
  const ws = workspace as { evolution_instance: string | null } | null;
  if (!ws?.evolution_instance) return { ok: false, message: "Canal WhatsApp do workspace não conectado" };

  try {
    await sendWhatsAppText({ instanceName: ws.evolution_instance, phone: s.notify_phone, text });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    console.error("[sendNotification] error:", msg);
    return { ok: false, message: msg };
  }
}

/**
 * Notifica handoff: monta texto a partir de conversa/membro/motivo
 * e envia. Falhas são logadas mas não propagadas — não bloqueiam o
 * fluxo da IA.
 */
export async function notifyHandoff(params: {
  workspaceId: string;
  conversationId: string;
  reason: string;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    const [{ data: workspace }, { data: conv }] = await Promise.all([
      supabase.from("workspaces").select("name").eq("id", params.workspaceId).maybeSingle(),
      supabase
        .from("whatsapp_conversations")
        .select("phone, display_name, member:member_id(name)")
        .eq("id", params.conversationId)
        .maybeSingle(),
    ]);

    const ws = workspace as { name: string } | null;
    const c = conv as
      | {
          phone: string;
          display_name: string | null;
          member: { name: string } | { name: string }[] | null;
        }
      | null;

    const member = Array.isArray(c?.member) ? c?.member[0] : c?.member;
    const contactName = member?.name ?? c?.display_name ?? c?.phone ?? "contato desconhecido";
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const link = appUrl ? `${appUrl}/dashboard/whatsapp?c=${params.conversationId}` : "";

    const text = [
      `🚨 *${ws?.name ?? "Gregário"}* — atenção necessária`,
      ``,
      `Contato: ${contactName}`,
      `Motivo: ${params.reason}`,
      link ? `\nAbrir conversa:\n${link}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await sendNotification(params.workspaceId, text);
    if (!result.ok && process.env.NODE_ENV !== "production") {
      console.log("[notifyHandoff] skipped:", result.message);
    }
  } catch (err) {
    console.error("[notifyHandoff] unexpected error:", err);
  }
}
