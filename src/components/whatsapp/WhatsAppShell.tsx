"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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

const NEAR_BOTTOM_PX = 120;

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
  const [search, setSearch] = useState("");
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  // Se o usuário rolou pra cima pra ler histórico, paramos de auto-scroll
  // até ele voltar perto do fim. Default true (na chegada do chat).
  const stickToBottomRef = useRef(true);

  // Sincroniza estado com props quando navegação muda URL.
  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Toda vez que a conversa ativa muda, força ir pro fim.
  useEffect(() => {
    stickToBottomRef.current = true;
    requestAnimationFrame(() => {
      const el = messagesScrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [initialActiveId]);

  // Auto-scroll quando chega mensagem nova — só se o usuário estiver perto do fim.
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = messagesScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onMessagesScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < NEAR_BOTTOM_PX;
  };

  // Estado da conexão realtime — exposto na UI pra diagnóstico.
  const [rtStatus, setRtStatus] = useState<"connecting" | "live" | "error">("connecting");

  // Realtime — atualiza estado direto do payload, sem ir no servidor.
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const init = async () => {
      // Garante que o cliente realtime está autenticado com JWT do usuário.
      // Sem isso, RLS no Postgres bloqueia eventos com filtro por workspace_id.
      // @supabase/ssr não propaga o token pro realtime automaticamente em todas
      // as situações — fazer manualmente é a forma confiável.
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
        }
      } catch (err) {
        console.error("[wa realtime] setAuth failed:", err);
      }

      if (cancelled) return;

      channel = supabase
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
            console.log("[wa realtime] msg INSERT", payload.new);
            const msg = payload.new as Message & { conversation_id: string };
            setConversations((prev) => {
              const idx = prev.findIndex((c) => c.id === msg.conversation_id);
              if (idx === -1) return prev;
              const preview = (msg.body ?? "").slice(0, 120) || previewForType(msg.type);
              const updated: Conversation = {
                ...prev[idx],
                last_message_at: msg.created_at,
                last_preview: preview,
              };
              return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
            });
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
            console.log("[wa realtime] conv", payload.eventType, payload.new ?? payload.old);
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
        .subscribe((status, err) => {
          console.log("[wa realtime] status:", status, err ?? "");
          if (status === "SUBSCRIBED") setRtStatus("live");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setRtStatus("error");
          } else {
            setRtStatus("connecting");
          }
        });
    };

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [workspaceId, initialActiveId, router]);

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (tab === "human") list = list.filter((c) => c.status === "human");
    else if (tab === "bot") list = list.filter((c) => c.status === "bot");
    const q = search.trim().toLowerCase();
    if (q) {
      const qDigits = q.replace(/\D/g, "");
      list = list.filter((c) => {
        const name = c.member?.name ?? c.display_name ?? c.phone;
        return (
          name.toLowerCase().includes(q) ||
          (qDigits && c.phone.includes(qDigits)) ||
          (c.last_preview ?? "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [conversations, tab, search]);

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
        <div
          className={`flex flex-shrink-0 flex-col gap-2 border-b border-forest-green/5 ${
            listCollapsed ? "p-2" : "p-3"
          }`}
        >
          <div className={`flex items-center gap-2 ${listCollapsed ? "justify-center" : ""}`}>
            <button
              type="button"
              onClick={() => setListCollapsed((v) => !v)}
              aria-label={listCollapsed ? "Expandir lista" : "Recolher lista"}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-forest-green/60 hover:bg-forest-green/[0.06] hover:text-forest-green"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
                    href={`/dashboard/whatsapp?tab=${t.value}${
                      initialActiveId ? `&c=${initialActiveId}` : ""
                    }`}
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
          {!listCollapsed && (
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nome, telefone ou mensagem…"
                className="w-full rounded-md bg-forest-green/[0.04] px-3 py-1.5 pr-7 font-sans text-xs text-forest-green outline-none placeholder:text-forest-green/40 focus:bg-forest-green/[0.08]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Limpar busca"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-forest-green/40 hover:bg-forest-green/10 hover:text-forest-green"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {listCollapsed ? (
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
            <p className="p-6 font-sans text-sm text-forest-green/50">
              {search ? "Nada encontrado pra essa busca." : "Nenhuma conversa nesta aba."}
            </p>
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
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-display text-sm font-bold text-forest-green">
                        {name}
                      </p>
                      <span className="flex-shrink-0 font-sans text-[10px] text-forest-green/40">
                        {relativeTime(c.last_message_at)}
                      </span>
                    </div>
                    <p className="truncate font-sans text-xs text-forest-green/60">
                      {c.last_preview ?? ""}
                    </p>
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
            <header className="flex flex-shrink-0 items-center justify-between border-b border-forest-green/5 p-3">
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-forest-green">
                  {activeMember?.name ??
                    activeConversation.display_name ??
                    formatPhone(activeConversation.phone)}
                </p>
                <p className="font-sans text-xs text-forest-green/60">
                  {formatPhone(activeConversation.phone)}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <RealtimeBadge status={rtStatus} />
                <span className="rounded-full bg-forest-green/10 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green/70">
                  {activeConversation.status}
                </span>
                <ConversationControls
                  conversationId={activeConversation.id}
                  status={activeConversation.status}
                />
              </div>
            </header>
            <div
              ref={messagesScrollRef}
              onScroll={onMessagesScroll}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface p-6"
            >
              {messages.length === 0 ? (
                <p className="font-sans text-sm text-forest-green/50">Sem mensagens.</p>
              ) : (
                renderMessagesWithDateSeparators(messages)
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

function RealtimeBadge({ status }: { status: "connecting" | "live" | "error" }) {
  const cfg = {
    connecting: { dot: "bg-yellow-400 animate-pulse", label: "Conectando" },
    live: { dot: "bg-action-green", label: "Tempo real" },
    error: { dot: "bg-red-500", label: "Sem realtime — atualize F5" },
  }[status];
  return (
    <span
      title={cfg.label}
      className="flex items-center gap-1.5 rounded-full bg-forest-green/[0.04] px-2 py-1"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <span className="font-sans text-[10px] text-forest-green/60">{cfg.label}</span>
    </span>
  );
}

function renderMessagesWithDateSeparators(messages: Message[]) {
  let lastKey = "";
  return messages.map((m) => {
    const date = new Date(m.created_at);
    const dayKey = date.toDateString();
    const showSeparator = dayKey !== lastKey;
    lastKey = dayKey;
    return (
      <Fragment key={m.id}>
        {showSeparator && (
          <div className="flex justify-center py-1">
            <span className="rounded-full bg-forest-green/10 px-3 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green/60">
              {formatDateSeparator(date)}
            </span>
          </div>
        )}
        <MessageBubble msg={m} />
      </Fragment>
    );
  });
}

function formatDateSeparator(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(date);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays > 0 && diffDays < 7) {
    return that.toLocaleDateString("pt-BR", { weekday: "long" });
  }
  return that.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: that.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(date);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) {
    return that.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  }
  return that.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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
