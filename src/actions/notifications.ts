"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/ai/notify";

export type NotificationFormState = { ok: boolean; message: string | null };

/**
 * Aceita variações comuns: "(11) 99999-9999", "11 99999 9999",
 * "+55 11 99999-9999", "5511999999999". Sempre retorna dígitos puros
 * com prefixo 55 (Brasil).
 */
function normalizeBrazilianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  // Brasil: 55 + DDD(2) + número(8 ou 9) → total 12 ou 13
  if (withCountry.length < 12 || withCountry.length > 13) return null;
  return withCountry;
}

export async function saveNotificationSettingsAction(
  _prev: NotificationFormState,
  formData: FormData,
): Promise<NotificationFormState> {
  const ctx = await requireWorkspace();
  const phoneRaw = ((formData.get("notify_phone") as string | null) ?? "").trim();
  const active = formData.get("notify_active") === "on";

  let normalized: string | null = null;
  if (phoneRaw) {
    normalized = normalizeBrazilianPhone(phoneRaw);
    if (!normalized) {
      return {
        ok: false,
        message: "Número inválido. Use o formato (DDD) 9 9999-9999.",
      };
    }
  }

  if (active && !normalized) {
    return { ok: false, message: "Informe um número antes de ativar." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ai_settings")
    .update({ notify_active: active, notify_phone: normalized } as never)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard/settings/notifications");
  return { ok: true, message: "Configurações salvas." };
}

export async function sendTestNotificationAction(
  _prev: NotificationFormState,
  _formData: FormData,
): Promise<NotificationFormState> {
  const ctx = await requireWorkspace();
  const result = await sendNotification(
    ctx.workspace.id,
    `🔔 *Teste de notificação*\n\nSe você recebeu, está tudo configurado pra receber alertas de urgência da IA.`,
  );
  if (!result.ok) return { ok: false, message: result.message ?? "Falha no envio" };
  return { ok: true, message: "Teste enviado." };
}
