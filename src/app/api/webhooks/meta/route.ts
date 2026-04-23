import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractMetaMessage } from "@/lib/whatsapp/meta";
import { isWithinAttendanceHours } from "@/lib/whatsapp/hours";
import { getOrCreateConversation, recordInboundMessage } from "@/lib/ai/process";
import { loadAISettings, isWithinBusinessHours } from "@/lib/ai/settings";
import { enqueueMessage, claimEntry, markDone } from "@/lib/ai/queue";
import { runAgentOnQueue } from "@/lib/ai/runner";
import { processInboundMedia } from "@/lib/ai/media-processor";
import { fetchMetaMediaUrl, downloadMetaMedia, uploadMediaToStorage } from "@/lib/whatsapp/media";
import { triggerFlows } from "@/lib/ai/flow-runner";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  handleMetaEvent(payload).catch((err) => console.error("[meta webhook]", err));
  return NextResponse.json({ ok: true });
}

async function handleMetaEvent(payload: unknown) {
  const msg = extractMetaMessage(payload);
  if (!msg) return;
  const hasMedia = msg.type === "audio" || msg.type === "image";
  if (!msg.body && !hasMedia) return;

  const supabase = createAdminClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, ia_active, whatsapp_active, attendance_start, attendance_end")
    .eq("meta_phone_number_id", msg.phoneNumberId)
    .maybeSingle();

  const ws = workspace as {
    id: string;
    name: string;
    ia_active: boolean;
    whatsapp_active: boolean;
    attendance_start: string | null;
    attendance_end: string | null;
  } | null;
  if (!ws) return;

  const conversation = await getOrCreateConversation({
    workspaceId: ws.id,
    phone: msg.from,
  });

  if (!ws.whatsapp_active || !ws.ia_active) {
    await recordInboundMessage({
      workspaceId: ws.id,
      conversationId: conversation.id,
      body: msg.body,
      type: msg.type,
    });
    return;
  }

  // Auto-reativa IA se timer venceu
  const { data: convFresh } = await supabase
    .from("whatsapp_conversations")
    .select("ia_active, ia_resume_at")
    .eq("id", conversation.id)
    .maybeSingle();
  const cf = convFresh as { ia_active: boolean; ia_resume_at: string | null } | null;
  if (cf && !cf.ia_active && cf.ia_resume_at && new Date(cf.ia_resume_at) <= new Date()) {
    await supabase
      .from("whatsapp_conversations")
      .update({ ia_active: true, ia_resume_at: null, status: "bot" } as never)
      .eq("id", conversation.id);
    cf.ia_active = true;
  }
  if (!cf?.ia_active) {
    await recordInboundMessage({
      workspaceId: ws.id,
      conversationId: conversation.id,
      body: msg.body,
      type: msg.type,
    });
    return;
  }

  const settings = await loadAISettings(ws.id);

  if (!isWithinBusinessHours(settings, { start: ws.attendance_start, end: ws.attendance_end })) {
    await recordInboundMessage({
      workspaceId: ws.id,
      conversationId: conversation.id,
      body: msg.body,
      type: msg.type,
    });
    return;
  }
  if (!isWithinAttendanceHours({ start: ws.attendance_start, end: ws.attendance_end }) && !settings.reply_outside_hours) {
    await recordInboundMessage({
      workspaceId: ws.id,
      conversationId: conversation.id,
      body: msg.body,
      type: msg.type,
    });
    return;
  }

  let processedText = msg.body;
  let storedUrl: string | null = null;

  if (hasMedia && msg.mediaId) {
    const token = process.env.META_WHATSAPP_TOKEN;
    if (token) {
      const meta = await fetchMetaMediaUrl({ mediaId: msg.mediaId, token });
      if (meta) {
        const downloaded = await downloadMetaMedia({ url: meta.url, token });
        if (downloaded) {
          const uploaded = await uploadMediaToStorage({
            workspaceId: ws.id,
            conversationId: conversation.id,
            buffer: downloaded.buffer,
            mimeType: downloaded.mimeType,
          });
          storedUrl = uploaded.publicUrl;
        }
      }
    }
  }

  const msgId = await recordInboundMessage({
    workspaceId: ws.id,
    conversationId: conversation.id,
    body: msg.body,
    type: msg.type,
    mediaUrl: storedUrl ?? undefined,
    mediaType: msg.mimeType ?? undefined,
    whatsappMsgId: msg.messageId,
  });

  if (hasMedia && storedUrl && msgId) {
    const result = await processInboundMedia({
      workspaceId: ws.id,
      conversationId: conversation.id,
      messageId: msgId,
      mediaUrl: storedUrl,
      mediaKind: msg.type as "audio" | "image",
      mimeType: msg.mimeType,
      caption: msg.caption ?? msg.body,
    });
    if (result.transcription) processedText = result.transcription;
    else if (result.analysis) processedText = `[imagem] ${result.analysis}${msg.body ? `\n${msg.body}` : ""}`;
    else if (result.error) processedText = msg.body || `[${msg.type} não processado: ${result.error}]`;
  }

  if (!processedText) return;

  if (conversation.__created) {
    await triggerFlows({
      workspaceId: ws.id,
      triggerType: "welcome",
      conversationId: conversation.id,
      phone: msg.from,
      messageText: processedText,
    }).catch((e) => console.error("[flow welcome]", e));
  }
  await triggerFlows({
    workspaceId: ws.id,
    triggerType: "first_contact",
    conversationId: conversation.id,
    phone: msg.from,
    messageText: processedText,
  }).catch((e) => console.error("[flow first_contact]", e));
  await triggerFlows({
    workspaceId: ws.id,
    triggerType: "keyword",
    conversationId: conversation.id,
    phone: msg.from,
    messageText: processedText,
  }).catch((e) => console.error("[flow keyword]", e));

  await enqueueMessage({
    workspaceId: ws.id,
    conversationId: conversation.id,
    phone: msg.from,
    text: processedText,
    debounceSeconds: settings.debounce_seconds,
  });

  scheduleProcessing({
    workspaceId: ws.id,
    conversationId: conversation.id,
    phone: msg.from,
    debounceSeconds: settings.debounce_seconds,
  });
}

function scheduleProcessing(params: {
  workspaceId: string;
  conversationId: string;
  phone: string;
  debounceSeconds: number;
}) {
  setTimeout(async () => {
    try {
      const claimed = await claimEntry(params.conversationId);
      if (!claimed) return;
      const supabase = createAdminClient();
      const { data: freshConv } = await supabase
        .from("whatsapp_conversations")
        .select("ia_active")
        .eq("id", params.conversationId)
        .maybeSingle();
      if (!(freshConv as { ia_active: boolean } | null)?.ia_active) {
        await markDone(claimed.id);
        return;
      }
      const combined = claimed.messages.join("\n");
      await runAgentOnQueue({
        workspaceId: params.workspaceId,
        conversationId: params.conversationId,
        phone: params.phone,
        combinedMessage: combined,
      });
      await markDone(claimed.id);
    } catch (err) {
      console.error("[meta debounce processor]", err);
    }
  }, Math.max(5, Math.min(30, params.debounceSeconds | 0)) * 1000);
}
