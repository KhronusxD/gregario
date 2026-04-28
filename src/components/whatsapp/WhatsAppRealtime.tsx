"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  workspaceId: string;
  activeConversationId: string | null;
};

export function WhatsAppRealtime({ workspaceId, activeConversationId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let dirty = false;

    // Throttle de refresh — várias mensagens em rajada não disparam N refreshes
    const flush = () => {
      if (!dirty) return;
      dirty = false;
      router.refresh();
    };
    const interval = setInterval(flush, 800);

    const channel = supabase
      .channel(`whatsapp:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_conversations",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          dirty = true;
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          // Mensagem da conversa aberta → refresh imediato
          const newConvId = (payload.new as { conversation_id?: string } | null)?.conversation_id;
          if (activeConversationId && newConvId === activeConversationId) {
            router.refresh();
            return;
          }
          dirty = true;
        },
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [workspaceId, activeConversationId, router]);

  return null;
}
