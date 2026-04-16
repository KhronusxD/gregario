import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { transcribeAudio } from "./audio";
import { analyzeImage } from "./vision";
import { canProcessMedia, logMediaUsage } from "./media-limits";

type WorkspacePlan = { plan: string };

async function loadPlan(workspaceId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", workspaceId)
    .maybeSingle();
  return (data as WorkspacePlan | null)?.plan ?? "essencial";
}

export async function processInboundMedia(params: {
  workspaceId: string;
  conversationId: string;
  messageId: string;
  mediaUrl: string;
  mediaKind: "audio" | "image";
  mimeType?: string;
  caption?: string;
}): Promise<{ ok: boolean; transcription?: string; analysis?: string; error?: string }> {
  const supabase = createAdminClient();
  const plan = await loadPlan(params.workspaceId);

  const gate = await canProcessMedia({
    workspaceId: params.workspaceId,
    plan,
    kind: params.mediaKind,
  });
  if (!gate.allowed) {
    await supabase
      .from("whatsapp_messages")
      .update({ processing_error: gate.reason ?? "bloqueado" } as never)
      .eq("id", params.messageId);
    return { ok: false, error: gate.reason };
  }

  if (params.mediaKind === "audio") {
    const result = await transcribeAudio({ url: params.mediaUrl, mimeType: params.mimeType });
    if (!result.text) {
      await supabase
        .from("whatsapp_messages")
        .update({ processing_error: result.error ?? "transcrição vazia" } as never)
        .eq("id", params.messageId);
      return { ok: false, error: result.error };
    }
    await supabase
      .from("whatsapp_messages")
      .update({
        transcription: result.text,
        processed_at: new Date().toISOString(),
        processing_error: null,
      } as never)
      .eq("id", params.messageId);
    await logMediaUsage({
      workspaceId: params.workspaceId,
      conversationId: params.conversationId,
      kind: "audio",
      metadata: { chars: result.text.length },
    });
    return { ok: true, transcription: result.text };
  }

  const result = await analyzeImage({ url: params.mediaUrl, caption: params.caption });
  if (!result.text) {
    await supabase
      .from("whatsapp_messages")
      .update({ processing_error: result.error ?? "análise vazia" } as never)
      .eq("id", params.messageId);
    return { ok: false, error: result.error };
  }
  await supabase
    .from("whatsapp_messages")
    .update({
      ai_analysis: result.text,
      processed_at: new Date().toISOString(),
      processing_error: null,
    } as never)
    .eq("id", params.messageId);
  await logMediaUsage({
    workspaceId: params.workspaceId,
    conversationId: params.conversationId,
    kind: "image",
    metadata: { chars: result.text.length },
  });
  return { ok: true, analysis: result.text };
}
