import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWithinAttendanceHours } from "@/lib/whatsapp/hours";
import { getOrCreateConversation, recordInboundMessage } from "@/lib/ai/process";
import { pauseAI } from "@/lib/ai/transfer";
import { loadAISettings, isWithinBusinessHours } from "@/lib/ai/settings";
import { enqueueMessage, claimEntry, markDone } from "@/lib/ai/queue";
import { runAgentOnQueue } from "@/lib/ai/runner";
import { isEcho } from "@/lib/ai/echo";
import { processInboundMedia } from "@/lib/ai/media-processor";
import { triggerFlows } from "@/lib/ai/flow-runner";

type EvolutionMediaMsg = { url?: string; mediaUrl?: string; mimetype?: string; caption?: string };

type EvolutionPayload = {
  instance?: string;
  event?: string;
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean; id?: string };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      audioMessage?: EvolutionMediaMsg;
      imageMessage?: EvolutionMediaMsg;
    };
    messageType?: string;
    pushName?: string;
  };
};

function extractPhone(jid?: string): string | null {
  if (!jid) return null;
  const match = jid.match(/^(\d+)@/);
  return match?.[1] ?? null;
}

function extractBody(data: EvolutionPayload["data"]): string {
  return (
    data?.message?.conversation ??
    data?.message?.extendedTextMessage?.text ??
    data?.message?.imageMessage?.caption ??
    ""
  );
}

function extractMedia(data: EvolutionPayload["data"]): { kind: "audio" | "image"; url: string; mimeType?: string; caption?: string } | null {
  const audio = data?.message?.audioMessage;
  if (audio?.url || audio?.mediaUrl) {
    return { kind: "audio", url: (audio.url ?? audio.mediaUrl)!, mimeType: audio.mimetype };
  }
  const image = data?.message?.imageMessage;
  if (image?.url || image?.mediaUrl) {
    return { kind: "image", url: (image.url ?? image.mediaUrl)!, mimeType: image.mimetype, caption: image.caption };
  }
  return null;
}

export async function POST(req: Request) {
  let payload: EvolutionPayload;
  try {
    payload = (await req.json()) as EvolutionPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  console.log(
    "[evolution webhook]",
    JSON.stringify({
      event: (payload as { event?: string }).event,
      instance: payload.instance,
      fromMe: payload.data?.key?.fromMe,
      messageType: payload.data?.messageType,
      hasBody: !!(payload.data?.message?.conversation || payload.data?.message?.extendedTextMessage?.text),
    }),
  );

  // Fire-and-forget: respond 200 fast, process in background
  handleEvolutionEvent(payload).catch((err) =>
    console.error("[evolution webhook] handler error:", err),
  );
  return NextResponse.json({ ok: true });
}

async function handleEvolutionEvent(payload: EvolutionPayload) {
  const instance = payload.instance;
  const data = payload.data;
  if (!instance) return;

  const supabase = createAdminClient();
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name, ia_active, whatsapp_active, attendance_start, attendance_end")
    .eq("evolution_instance", instance)
    .maybeSingle();

  if (wsError) {
    console.error("[evolution webhook] workspace lookup error:", wsError.message);
    return;
  }

  const ws = workspace as {
    id: string;
    name: string;
    ia_active: boolean;
    whatsapp_active: boolean;
    attendance_start: string | null;
    attendance_end: string | null;
  } | null;
  if (!ws) {
    console.error("[evolution webhook] no workspace found for instance:", instance);
    return;
  }

  // connection.update → ativa whatsapp_active quando sessão fica "open"
  const event = (payload as { event?: string }).event ?? "";
  if (/connection[._]update/i.test(event)) {
    const state = (data as { state?: string } | null)?.state;
    if (state === "open" && !ws.whatsapp_active) {
      await supabase
        .from("workspaces")
        .update({ whatsapp_active: true } as never)
        .eq("id", ws.id);
    }
    return;
  }

  if (!data) return;

  const phone = extractPhone(data.key?.remoteJid);
  if (!phone) {
    console.warn("[evolution webhook] could not extract phone from:", data.key?.remoteJid);
    return;
  }

  const conversation = await getOrCreateConversation({ workspaceId: ws.id, phone });

  // Outbound (fromMe) — humano respondeu pelo celular
  if (data.key?.fromMe) {
    const body = extractBody(data);
    if (body && (await isEcho({ conversationId: conversation.id, body }))) {
      return; // é eco do que a IA acabou de enviar
    }
    if (body) {
      await supabase.from("whatsapp_messages").insert({
        workspace_id: ws.id,
        conversation_id: conversation.id,
        from_me: true,
        body,
        type: "text",
        sent_by: "human",
        ai_handled: false,
      } as never);
    }

    const settings = await loadAISettings(ws.id);
    if (settings.pause_when_human_on_mobile) {
      await pauseAI({ conversationId: conversation.id });
      if (settings.resume_after_escalation_min) {
        await supabase
          .from("whatsapp_conversations")
          .update({
            ia_resume_at: new Date(Date.now() + settings.resume_after_escalation_min * 60_000).toISOString(),
            handoff_reason: "humano respondeu pelo celular",
            handoff_at: new Date().toISOString(),
          } as never)
          .eq("id", conversation.id);
      }
    }
    return;
  }

  // Sempre persiste o inbound — a aba WhatsApp depende disso.
  // Se a IA/feature estiver desativada, ainda gravamos pra operador humano ver.
  if (!ws.whatsapp_active || !ws.ia_active) {
    const body = extractBody(data);
    const media = extractMedia(data);
    if (body || media) {
      await recordInboundMessage({
        workspaceId: ws.id,
        conversationId: conversation.id,
        body: media?.caption ?? body,
        type: media?.kind,
        mediaUrl: media?.url,
        mediaType: media?.mimeType,
        whatsappMsgId: data.key?.id,
      });
    }
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
    // Ainda salva o inbound mesmo sem IA pra aparecer na /dashboard/whatsapp
    const body = extractBody(data);
    if (body) await recordInboundMessage({ workspaceId: ws.id, conversationId: conversation.id, body });
    return;
  }

  const settings = await loadAISettings(ws.id);

  if (!isWithinBusinessHours(settings, { start: ws.attendance_start, end: ws.attendance_end })) {
    // Fora do horário — só salva, não responde
    const body = extractBody(data);
    if (body) await recordInboundMessage({ workspaceId: ws.id, conversationId: conversation.id, body });
    return;
  }
  // Compat legacy (workspace attendance janela)
  if (!isWithinAttendanceHours({ start: ws.attendance_start, end: ws.attendance_end }) && !settings.reply_outside_hours) {
    const body = extractBody(data);
    if (body) await recordInboundMessage({ workspaceId: ws.id, conversationId: conversation.id, body });
    return;
  }

  const body = extractBody(data);
  const media = extractMedia(data);
  if (!body && !media) return;

  let processedText = body;

  if (media) {
    const msgId = await recordInboundMessage({
      workspaceId: ws.id,
      conversationId: conversation.id,
      body: media.caption ?? body,
      type: media.kind,
      mediaUrl: media.url,
      mediaType: media.mimeType,
      whatsappMsgId: data.key?.id,
    });
    if (msgId) {
      const result = await processInboundMedia({
        workspaceId: ws.id,
        conversationId: conversation.id,
        messageId: msgId,
        mediaUrl: media.url,
        mediaKind: media.kind,
        mimeType: media.mimeType,
        caption: media.caption ?? body,
      });
      if (result.transcription) processedText = result.transcription;
      else if (result.analysis) processedText = `[imagem] ${result.analysis}${body ? `\n${body}` : ""}`;
      else if (result.error) processedText = body || `[${media.kind} não processado: ${result.error}]`;
    }
  } else if (body) {
    await recordInboundMessage({ workspaceId: ws.id, conversationId: conversation.id, body });
  }

  if (!processedText) return;

  // Dispara fluxos: welcome (primeira msg ever), first_contact (primeira nesta conversa), keyword
  if (conversation.__created) {
    await triggerFlows({
      workspaceId: ws.id,
      triggerType: "welcome",
      conversationId: conversation.id,
      phone,
      messageText: processedText,
    }).catch((e) => console.error("[flow welcome]", e));
  }
  await triggerFlows({
    workspaceId: ws.id,
    triggerType: "first_contact",
    conversationId: conversation.id,
    phone,
    messageText: processedText,
  }).catch((e) => console.error("[flow first_contact]", e));
  await triggerFlows({
    workspaceId: ws.id,
    triggerType: "keyword",
    conversationId: conversation.id,
    phone,
    messageText: processedText,
  }).catch((e) => console.error("[flow keyword]", e));

  await enqueueMessage({
    workspaceId: ws.id,
    conversationId: conversation.id,
    phone,
    text: processedText,
    debounceSeconds: settings.debounce_seconds,
  });

  scheduleProcessing({
    workspaceId: ws.id,
    conversationId: conversation.id,
    phone,
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
      console.error("[evolution debounce processor]", err);
    }
  }, Math.max(5, Math.min(30, params.debounceSeconds | 0)) * 1000);
}
