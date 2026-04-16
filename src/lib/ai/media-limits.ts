import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type MediaKind = "audio" | "image";

const LIMITS: Record<string, { audio_per_month: number; image_per_month: number }> = {
  essencial: { audio_per_month: 0, image_per_month: 30 },
  pastoral: { audio_per_month: 300, image_per_month: 200 },
  rede: { audio_per_month: Infinity, image_per_month: Infinity },
};

export async function canProcessMedia(params: {
  workspaceId: string;
  plan: string;
  kind: MediaKind;
}): Promise<{ allowed: boolean; reason?: string }> {
  const plan = LIMITS[params.plan] ?? LIMITS.essencial;
  const max = params.kind === "audio" ? plan.audio_per_month : plan.image_per_month;
  if (max === 0) return { allowed: false, reason: `Plano ${params.plan} não inclui ${params.kind}.` };
  if (max === Infinity) return { allowed: true };

  const supabase = createAdminClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const action = params.kind === "audio" ? "audio_transcription" : "image_analysis";
  const { count } = await supabase
    .from("ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", params.workspaceId)
    .eq("action", action)
    .gte("created_at", monthStart.toISOString());

  if ((count ?? 0) >= max) {
    return { allowed: false, reason: `Limite mensal de ${params.kind} atingido (${max}). Faça upgrade do plano.` };
  }
  return { allowed: true };
}

export async function logMediaUsage(params: {
  workspaceId: string;
  conversationId: string;
  kind: MediaKind;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();
  const action = params.kind === "audio" ? "audio_transcription" : "image_analysis";
  await supabase.from("ai_usage_logs").insert({
    workspace_id: params.workspaceId,
    action,
    conversation_id: params.conversationId,
    metadata: params.metadata ?? {},
  } as never);
}
