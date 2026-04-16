import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type QueueEntry = {
  id: string;
  workspace_id: string;
  conversation_id: string;
  phone: string;
  messages: string[];
  process_after: string;
  status: "waiting" | "processing" | "done" | "error";
  attempts: number;
};

const MIN_DEBOUNCE = 5;
const MAX_DEBOUNCE = 30;

export function clampDebounce(seconds: number): number {
  return Math.max(MIN_DEBOUNCE, Math.min(MAX_DEBOUNCE, seconds | 0));
}

export async function enqueueMessage(params: {
  workspaceId: string;
  conversationId: string;
  phone: string;
  text: string;
  debounceSeconds: number;
}): Promise<QueueEntry> {
  const supabase = createAdminClient();
  const debounceMs = clampDebounce(params.debounceSeconds) * 1000;
  const processAfter = new Date(Date.now() + debounceMs).toISOString();

  const { data: existing } = await supabase
    .from("ai_message_queue")
    .select("id, messages")
    .eq("conversation_id", params.conversationId)
    .eq("status", "waiting")
    .maybeSingle();

  if (existing) {
    const curr = existing as { id: string; messages: string[] };
    const merged = [...(curr.messages ?? []), params.text];
    const { data: updated } = await supabase
      .from("ai_message_queue")
      .update({ messages: merged, process_after: processAfter } as never)
      .eq("id", curr.id)
      .select("*")
      .single();
    return updated as QueueEntry;
  }

  const { data: created, error } = await supabase
    .from("ai_message_queue")
    .insert({
      workspace_id: params.workspaceId,
      conversation_id: params.conversationId,
      phone: params.phone,
      messages: [params.text],
      process_after: processAfter,
      status: "waiting",
    } as never)
    .select("*")
    .single();

  if (error || !created) throw new Error(`enqueueMessage failed: ${error?.message}`);
  return created as QueueEntry;
}

export async function claimEntry(conversationId: string): Promise<QueueEntry | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_message_queue")
    .update({ status: "processing", attempts: 1 } as never)
    .eq("conversation_id", conversationId)
    .eq("status", "waiting")
    .lte("process_after", new Date().toISOString())
    .select("*")
    .maybeSingle();
  return (data as QueueEntry | null) ?? null;
}

export async function claimById(entryId: string): Promise<QueueEntry | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_message_queue")
    .update({ status: "processing" } as never)
    .eq("id", entryId)
    .eq("status", "waiting")
    .select("*")
    .maybeSingle();
  return (data as QueueEntry | null) ?? null;
}

export async function markDone(entryId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("ai_message_queue")
    .update({ status: "done" } as never)
    .eq("id", entryId);
}

export async function markError(entryId: string, message: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("ai_message_queue")
    .update({ status: "error", last_error: message.slice(0, 1000) } as never)
    .eq("id", entryId);
}

export async function listStaleWaiting(limit = 20): Promise<QueueEntry[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_message_queue")
    .select("*")
    .eq("status", "waiting")
    .lte("process_after", new Date().toISOString())
    .limit(limit);
  return (data as QueueEntry[] | null) ?? [];
}

export async function reapStuckProcessing(olderThanMinutes = 5): Promise<number> {
  const supabase = createAdminClient();
  const threshold = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  const { data } = await supabase
    .from("ai_message_queue")
    .update({ status: "error", last_error: "stuck in processing" } as never)
    .eq("status", "processing")
    .lt("updated_at", threshold)
    .select("id");
  return (data as unknown[] | null)?.length ?? 0;
}
