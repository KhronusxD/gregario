"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { initials, formatPhone } from "@/lib/members";
import { OperatorComposer } from "./OperatorComposer";
import { ConversationControls } from "./ConversationControls";
import { MessageBubble } from "./MessageBubble";

type Member = { id: string; name: string; phone: string | null; status: string } | null;

export type Conversation = {
  id: string;
  phone: string;
  display_name: string | null;
  status: string;
  last_message_at: string | null;
  last_preview: string | null;
  member: Member;
};

export type Message = {
  id: string;
  conversation_id?: string;
  sent_by: "member" | "human" | "ia" | "system" | null;
  body: string | null;
  type: string | null;
  media_url: string | null;
  media_type: string | null;
  transcription: string | null;
  ai_analysis: string | null;
  created_at: string;
};

type Props = {
  workspaceId: string;
  initialConversations: Conversation[];
  initialActiveId: string | null;
  initialMessages: Message[];
  initialMember: Member;
  tab: string;
};

const TABS = [
  { value: "all", label: "Todas" },
  { value: "human", label: "Aguardando" },
  { value: "bot", label: "Bot ativo" },
];

export function WhatsAppShell({
  workspaceId,
  initialConversations,
  initialActiveId,
  initialMessages,
  initialMember,
  tab,
}: Props) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  // Quando navegação acontece (URL muda), sincroniza estado com o que o servidor mandou.
  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Auto-scroll do chat: rola pro fim quando mensagens mudam (ou conversa muda).
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, initialActiveId]);

  // Realtime — atualiza estado direto do payload, sem ir no servidor.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`whatsapp:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const msg = payload.new as Message & { conversation_id: string };
          // Lista: bumpa conversa pro topo com novo preview.
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === msg.conversation_id);
            if (idx === -1) return prev; // conversa nova ainda não está na lista — INSERT da conversa cuidará
            const preview = (msg.body ?? "").slice(0, 120) || previewForType(msg.type);
            const updated: Conversation = {
              ...prev[idx],
              last_message_at: msg.created_at,
              last_preview: preview,
            };
            return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
          });
          // Chat ativo: anexa.
          if (initialActiveId === msg.conversation_id) {
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const msg = payload.new as Message & { conversation_id: string };
          if (initialActiveId === msg.conversation_id) {
            setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_conversations",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const conv = payload.new as Omit<Conversation, "member">;
            setConversations((prev) =>
              prev.some((c) => c.id === conv.id) ? prev : [{ ...conv, member: null }, ...prev],
            );
          } else if (payload.eventType === "UPDATE") {
            const conv = payload.new as Omit<Conversation, "member">;
            setConversations((prev) =>
              prev.map((c) => (c.id === conv.id ? { ...c, ...conv, member: c.member } : c)),
            );
          } else if (payload.eventType === "DELETE") {
            const conv = payload.old as { id: string };
            setConversations((prev) => prev.filter((c) => c.id !== conv.id));
          }
        },
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV !== "production") {
          console.log("[wa realtime]", status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, initialActiveId, router]);

  const filteredConversations = useMemo(() => {
    if (tab === "human") return conversations.filter((c) => c.status === "human");
    if (tab === "bot") return conversations.filter((c) => c.status === "bot");
    return conversations;
  }, [conversations, tab]);

  const activeConversation = conversations.find((c) => c.id === initialActiveId) ?? null;
  const activeMember: Member = initialMember ?? activeConversation?.member ?? null;

  // Lista colapsável — preferência persistida em localStorage.
  const [listCollapsed, setListCollapsed] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("wa:listCollapsed");
    if (saved === "1") setListCollapsed(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("wa:listCollapsed", listCollapsed ? "1" : "0");
  }, [listCollapsed]);

  const gridCols = listCollapsed
    ? "grid-cols-[44px_1fr_280px]"
    : "grid-cols-[300px_1fr_280px]";

  return (
    <div className={`grid min-h-0 flex-1 ${gridCols} gap-3 overflow-hidden rounded-lg bg-card shadow-card`}>
      {/* Coluna 1: lista (colapsável) */}
      <aside className="flex min-h-0 flex-col overflow-hidden border-r border-forest-green/5">
        <div className={`flex flex-shrink-0 items-center gap-2 border-b border-forest-green/5 ${listCollapsed ? "justify-center p-2" : "p-3"}`}>
          <button
            type="button"
            onClick={() => setListCollapsed((v) => !v)}
            aria-label={listCollapsed ? "Expandir lista" : "Recolher lista"}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-forest-green/60 hover:bg-forest-green/[0.06] hover:text-forest-green"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {listCollapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>
          {!listCollapsed && (
            <div className="flex flex-1 gap-1.5">
              {TABS.map((t) => (
                <a
                  key={t.value}
                  href={`/dashboard/whatsapp?tab=${t.value}${initialActiveId ? `&c=${initialActiveId}` : ""}`}
                  className={`rounded-full px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-widest ${
                    tab === t.value
                      ? "bg-forest-green text-card"
                      : "bg-forest-green/[0.06] text-forest-green/60 hover:text-forest-green"
                  }`}
                >
                  {t.label}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {listCollapsed ? (
            // Modo colapsado: tira só os avatares. Hover/click ainda navega.
            filteredConversations.map((c) => {
              const member = c.member;
              const name = member?.name ?? c.display_name ?? formatPhone(c.phone);
              const isActive = c.id === initialActiveId;
              return (
                <a
                  key={c.id}
                  href={`/dashboard/whatsapp?tab=${tab}&c=${c.id}`}
                  title={name}
                  className={`flex items-center justify-center border-b border-forest-green/5 py-2.5 ${
                    isActive ? "bg-forest-green/[0.06]" : "hover:bg-forest-green/[0.03]"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-action-green to-forest-green font-display text-[10px] text-card">
                    {initials(name)}
                  </span>
                </a>
              );
            })
          ) : filteredConversations.length === 0 ? (
            <p className="p-6 font-sans text-sm text-forest-green/50">Nenhuma conversa nesta aba.</p>
          ) : (
            filteredConversations.map((c) => {
              const member = c.member;
              const name = member?.name ?? c.display_name ?? formatPhone(c.phone);
              const isActive = c.id === initialActiveId;
              return (
                <a
                  key={c.id}
                  href={`/dashboard/whatsapp?tab=${tab}&c=${c.id}`}
                  className={`flex items-start gap-3 border-b border-forest-green/5 p-3 text-left ${
                    isActive ? "bg-forest-green/[0.06]" : "hover:bg-forest-green/[0.03]"
                  }`}
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-action-green to-forest-green font-display text-[10px] text-card">
                    {initials(name)}
                  </span>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-display text-sm font-bold text-forest-green">{name}</p>
                    <p className="truncate font-sans text-xs text-forest-green/60">{c.last_preview ?? ""}</p>
                  </div>
                </a>
              );
            })
          )}
        </div>
      </aside>

      {/* Coluna 2: chat */}
      <section className="flex min-h-0 flex-col overflow-hidden">
        {!activeConversation ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-sans text-sm text-forest-green/50">Selecione uma conversa.</p>
          </div>
        ) : (
          <>
            <header className="flex flex-shrink-0 items-center justify-between border-b border-forest-green/5 p-4">
              <div>
                <p className="font-display text-sm font-bold text-forest-green">
                  {activeMember?.name ?? activeConversation.display_name ?? formatPhone(activeConversation.phone)}
                </p>
                <p className="font-sans text-xs text-forest-green/60">{formatPhone(activeConversation.phone)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-forest-green/10 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green/70">
                  {activeConversation.status}
                </span>
                <ConversationControls conversationId={activeConversation.id} status={activeConversation.status} />
              </div>
            </header>
            <div ref={messagesScrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface p-6">
              {messages.length === 0 ? (
                <p className="font-sans text-sm text-forest-green/50">Sem mensagens.</p>
              ) : (
                messages.map((m) => <MessageBubble key={m.id} msg={m} />)
              )}
            </div>
            <div className="flex-shrink-0">
              <OperatorComposer conversationId={activeConversation.id} />
            </div>
          </>
        )}
      </section>

      {/* Coluna 3: info do membro */}
      <aside className="min-h-0 overflow-y-auto border-l border-forest-green/5 p-6">
        {!activeMember ? (
          <p className="font-sans text-sm text-forest-green/50">Contato não vinculado a um membro.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-action-green to-forest-green font-display text-sm text-card">
                {initials(activeMember.name)}
              </span>
              <div>
                <p className="font-display text-sm font-bold text-forest-green">{activeMember.name}</p>
                <p className="font-sans text-xs text-forest-green/60">{formatPhone(activeMember.phone)}</p>
              </div>
            </div>
            <div className="space-y-2 font-sans text-xs text-forest-green/70">
              <p>
                <span className="font-bold uppercase tracking-widest text-forest-green/50">Situação: </span>
                {activeMember.status}
              </p>
            </div>
            <a
              href={`/dashboard/members/${activeMember.id}`}
              className="mt-6 inline-block rounded-full bg-forest-green/[0.06] px-4 py-2 font-display text-xs font-bold text-forest-green hover:bg-forest-green/[0.1]"
            >
              Abrir perfil completo
            </a>
          </>
        )}
      </aside>
    </div>
  );
}

function previewForType(type: string | null | undefined): string {
  switch (type) {
    case "audio":
      return "🎤 Áudio";
    case "image":
      return "📷 Imagem";
    case "document":
      return "📄 Documento";
    case "video":
      return "🎬 Vídeo";
    default:
      return "";
  }
}
