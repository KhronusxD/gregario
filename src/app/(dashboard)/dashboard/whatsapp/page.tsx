import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ChannelStatusBadge } from "@/components/whatsapp/ChannelStatusBadge";
import { WhatsAppShell, type Conversation, type Message } from "@/components/whatsapp/WhatsAppShell";

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; c?: string }>;
}) {
  const ctx = await requireWorkspace();
  const { tab = "all", c } = await searchParams;
  const supabase = await createClient();

  // Sem filtro por tab no servidor — o cliente filtra do estado completo,
  // assim realtime funciona pra todas as conversas e troca de aba é instantânea.
  const { data: conversationsRaw, error: convError } = await supabase
    .from("whatsapp_conversations")
    .select(
      "id, phone, display_name, status, last_message_at, last_preview, member:member_id(id, name, phone, status)",
    )
    .eq("workspace_id", ctx.workspace.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);
  if (convError) {
    console.error("[whatsapp page] conversations query error:", convError.message);
  }

  const conversations: Conversation[] = ((conversationsRaw ?? []) as Array<{
    id: string;
    phone: string;
    display_name: string | null;
    status: string;
    last_message_at: string | null;
    last_preview: string | null;
    member:
      | { id: string; name: string; phone: string | null; status: string }
      | { id: string; name: string; phone: string | null; status: string }[]
      | null;
  }>).map((row) => ({
    ...row,
    member: Array.isArray(row.member) ? row.member[0] ?? null : row.member,
  }));

  const activeId = c ?? conversations[0]?.id ?? null;

  let messages: Message[] = [];
  if (activeId) {
    const { data } = await supabase
      .from("whatsapp_messages")
      .select(
        "id, conversation_id, sent_by, body, type, media_url, media_type, transcription, ai_analysis, created_at",
      )
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true })
      .limit(200);
    messages = (data ?? []) as Message[];
  }

  const activeMember = activeId
    ? conversations.find((cv) => cv.id === activeId)?.member ?? null
    : null;

  return (
    <main className="ml-64 flex h-[calc(100vh-5rem)] flex-col overflow-hidden p-3">
      <div className="mb-2 flex flex-shrink-0 items-center justify-between gap-4 px-1">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-forest-green">
            Secretaria WhatsApp
          </h1>
          <span className="font-sans text-xs text-forest-green/50">
            Conversas atendidas pela IA e pela equipe
          </span>
        </div>
        <ChannelStatusBadge />
      </div>

      <WhatsAppShell
        workspaceId={ctx.workspace.id}
        initialConversations={conversations}
        initialActiveId={activeId}
        initialMessages={messages}
        initialMember={activeMember}
        tab={tab}
      />
    </main>
  );
}
