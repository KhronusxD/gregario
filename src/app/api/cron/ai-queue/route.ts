import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimById, listStaleWaiting, markDone, markError, reapStuckProcessing, type QueueEntry } from "@/lib/ai/queue";
import { runAgentOnQueue } from "@/lib/ai/runner";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const stale = await listStaleWaiting(20);
  let processed = 0;
  let failed = 0;

  for (const entry of stale) {
    const claimed = await claimById(entry.id);
    if (!claimed) continue;
    try {
      await processEntry(claimed);
      await markDone(claimed.id);
      processed++;
    } catch (err) {
      await markError(claimed.id, err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  const reaped = await reapStuckProcessing(5);

  return NextResponse.json({ ok: true, processed, failed, reaped });
}

async function processEntry(entry: QueueEntry) {
  const supabase = createAdminClient();
  const { data: conv } = await supabase
    .from("whatsapp_conversations")
    .select("ia_active, workspace_id, phone")
    .eq("id", entry.conversation_id)
    .maybeSingle();

  const c = conv as { ia_active: boolean; workspace_id: string; phone: string } | null;
  if (!c?.ia_active) return;

  const combined = entry.messages.join("\n");
  await runAgentOnQueue({
    workspaceId: c.workspace_id,
    conversationId: entry.conversation_id,
    phone: c.phone,
    combinedMessage: combined,
  });
}
