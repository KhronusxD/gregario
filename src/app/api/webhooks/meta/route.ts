import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractMetaMessage } from "@/lib/whatsapp/meta";
import { isWithinAttendanceHours } from "@/lib/whatsapp/hours";
import {
  getOrCreateConversation,
  recordInboundMessage,
  processConversation,
} from "@/lib/ai/process";
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

  const msg = extractMetaMessage(payload);
  if (!msg || !msg.body) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, ia_active, whatsapp_active, attendance_start, attendance_end")
    .eq("meta_phone_number_id", msg.phoneNumberId)
    .maybeSingle();

  const ws = workspace as {
    id: string;
    ia_active: boolean;
    whatsapp_active: boolean;
    attendance_start: string | null;
    attendance_end: string | null;
  } | null;

  if (!ws || !ws.whatsapp_active || !ws.ia_active) {
    return NextResponse.json({ ok: true });
  }
  if (!isWithinAttendanceHours({ start: ws.attendance_start, end: ws.attendance_end })) {
    return NextResponse.json({ ok: true });
  }

  const conversation = await getOrCreateConversation({
    workspaceId: ws.id,
    phone: msg.from,
  });

  if (!conversation.ia_active) return NextResponse.json({ ok: true });

  await recordInboundMessage({
    workspaceId: ws.id,
    conversationId: conversation.id,
    body: msg.body,
    type: msg.type,
  });

  // Fire-and-forget processing — webhook must return 200 quickly to avoid Meta retries.
  processConversation({
    workspaceId: ws.id,
    conversationId: conversation.id,
    phone: msg.from,
  }).catch((err) => console.error("[meta webhook] process error:", err));

  return NextResponse.json({ ok: true });
}
