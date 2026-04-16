import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const ECHO_WINDOW_MS = 2 * 60 * 1000;

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function isEcho(params: {
  conversationId: string;
  body: string;
}): Promise<boolean> {
  if (!params.body) return false;
  const supabase = createAdminClient();
  const threshold = new Date(Date.now() - ECHO_WINDOW_MS).toISOString();

  const { data } = await supabase
    .from("whatsapp_messages")
    .select("body")
    .eq("conversation_id", params.conversationId)
    .eq("from_me", true)
    .gte("created_at", threshold)
    .order("created_at", { ascending: false })
    .limit(10);

  const sent = ((data as Array<{ body: string | null }> | null) ?? [])
    .map((m) => normalize(m.body ?? ""))
    .filter(Boolean);
  if (sent.length === 0) return false;

  const incoming = normalize(params.body);
  if (!incoming) return false;

  return sent.some((s) => s === incoming || (s.length > 40 && s.includes(incoming)) || (incoming.length > 40 && incoming.includes(s)));
}
