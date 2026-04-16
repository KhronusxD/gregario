import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWithinAttendanceHours } from "@/lib/whatsapp/hours";
import {
  getOrCreateConversation,
  recordInboundMessage,
  processConversation,
} from "@/lib/ai/process";
import { pauseAI } from "@/lib/ai/transfer";

type EvolutionPayload = {
  instance?: string;
  event?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
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
    ""
  );
}

export async function POST(req: Request) {
  let payload: EvolutionPayload;
  try {
    payload = (await req.json()) as EvolutionPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const instance = payload.instance;
  const data = payload.data;
  if (!instance || !data) return NextResponse.json({ ok: true });

  const phone = extractPhone(data.key?.remoteJid);
  if (!phone) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, ia_active, whatsapp_active, attendance_start, attendance_end")
    .eq("evolution_instance", instance)
    .maybeSingle();

  const ws = workspace as {
    id: string;
    ia_active: boolean;
    whatsapp_active: boolean;
    attendance_start: string | null;
    attendance_end: string | null;
  } | null;

  if (!ws) return NextResponse.json({ ok: true });

  const conversation = await getOrCreateConversation({
    workspaceId: ws.id,
    phone,
  });

  if (data.key?.fromMe) {
    await pauseAI({ conversationId: conversation.id });
    return NextResponse.json({ ok: true });
  }

  if (!ws.whatsapp_active || !ws.ia_active) return NextResponse.json({ ok: true });
  if (!conversation.ia_active) return NextResponse.json({ ok: true });
  if (!isWithinAttendanceHours({ start: ws.attendance_start, end: ws.attendance_end })) {
    return NextResponse.json({ ok: true });
  }

  const body = extractBody(data);
  if (!body) return NextResponse.json({ ok: true });

  await recordInboundMessage({
    workspaceId: ws.id,
    conversationId: conversation.id,
    body,
  });

  processConversation({
    workspaceId: ws.id,
    conversationId: conversation.id,
    phone,
  }).catch((err) => console.error("[evolution webhook] process error:", err));

  return NextResponse.json({ ok: true });
}
