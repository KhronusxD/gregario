import { PageHeader } from "@/components/admin/PageHeader";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { initials, formatPhone } from "@/lib/members";

const TABS = [
  { value: "human", label: "Aguardando" },
  { value: "bot", label: "Bot ativo" },
  { value: "all", label: "Todas" },
];

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; c?: string }>;
}) {
  const ctx = await requireWorkspace();
  const { tab = "human", c } = await searchParams;
  const supabase = await createClient();

  let convQuery = supabase
    .from("whatsapp_conversations")
    .select("id, phone, display_name, status, last_message_at, last_preview, member:member_id(id, name, phone, status)")
    .eq("workspace_id", ctx.workspace.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);
  if (tab === "human") convQuery = convQuery.eq("status", "human");
  else if (tab === "bot") convQuery = convQuery.eq("status", "bot");

  const { data: conversations } = await convQuery;
  const list = (conversations ?? []) as Array<{
    id: string;
    phone: string;
    display_name: string | null;
    status: string;
    last_message_at: string | null;
    last_preview: string | null;
    member: { id: string; name: string; phone: string | null; status: string } | { id: string; name: string; phone: string | null; status: string }[] | null;
  }>;

  const activeId = c ?? list[0]?.id ?? null;
  const active = list.find((x) => x.id === activeId);

  let messages: Array<{
    id: string;
    sender: string;
    body: string | null;
    created_at: string;
  }> = [];
  if (active) {
    const { data } = await supabase
      .from("whatsapp_messages")
      .select("id, sender, body, created_at")
      .eq("conversation_id", active.id)
      .order("created_at", { ascending: true })
      .limit(200);
    messages = (data ?? []) as typeof messages;
  }

  const activeMember = active ? (Array.isArray(active.member) ? active.member[0] : active.member) : null;

  return (
    <main className="ml-64 min-h-[calc(100vh-5rem)] p-10">
      <PageHeader
        eyebrow="Atendimento"
        title="Secretaria WhatsApp"
        description="Conversas atendidas pela IA e pela equipe. Três colunas: lista, chat e contexto do membro."
      />

      <div className="grid h-[calc(100vh-16rem)] grid-cols-[320px_1fr_300px] gap-4 rounded-lg bg-card shadow-card">
        {/* Column 1: list */}
        <aside className="flex flex-col border-r border-forest-green/5">
          <div className="flex gap-2 border-b border-forest-green/5 p-4">
            {TABS.map((t) => (
              <a
                key={t.value}
                href={`/dashboard/whatsapp?tab=${t.value}`}
                className={`rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest ${
                  tab === t.value
                    ? "bg-forest-green text-card"
                    : "bg-forest-green/[0.06] text-forest-green/60 hover:text-forest-green"
                }`}
              >
                {t.label}
              </a>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {list.length === 0 ? (
              <p className="p-6 font-sans text-sm text-forest-green/50">
                Nenhuma conversa nesta aba.
              </p>
            ) : (
              list.map((c) => {
                const member = Array.isArray(c.member) ? c.member[0] : c.member;
                const name = member?.name ?? c.display_name ?? formatPhone(c.phone);
                const isActive = c.id === activeId;
                return (
                  <a
                    key={c.id}
                    href={`/dashboard/whatsapp?tab=${tab}&c=${c.id}`}
                    className={`flex items-start gap-3 border-b border-forest-green/5 p-4 text-left ${
                      isActive ? "bg-forest-green/[0.06]" : "hover:bg-forest-green/[0.03]"
                    }`}
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-action-green to-forest-green font-display text-xs text-card">
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

        {/* Column 2: chat */}
        <section className="flex flex-col">
          {!active ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="font-sans text-sm text-forest-green/50">Selecione uma conversa.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between border-b border-forest-green/5 p-4">
                <div>
                  <p className="font-display text-sm font-bold text-forest-green">
                    {activeMember?.name ?? active.display_name ?? formatPhone(active.phone)}
                  </p>
                  <p className="font-sans text-xs text-forest-green/60">{formatPhone(active.phone)}</p>
                </div>
                <span className="rounded-full bg-forest-green/10 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green/70">
                  {active.status}
                </span>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto bg-surface p-6">
                {messages.length === 0 ? (
                  <p className="font-sans text-sm text-forest-green/50">Sem mensagens.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.sender === "member" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 font-sans text-sm ${
                          m.sender === "member"
                            ? "bg-card text-forest-green shadow-card"
                            : "bg-gradient-to-br from-forest-green to-action-green text-card"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body ?? ""}</p>
                        <p className={`mt-1 text-[10px] ${m.sender === "member" ? "text-forest-green/40" : "text-card/70"}`}>
                          {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {m.sender === "bot" ? " · IA" : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form className="flex gap-2 border-t border-forest-green/5 p-4">
                <input
                  disabled
                  placeholder="Responder (envio manual em breve)..."
                  className="flex-1 rounded-full bg-forest-green/[0.04] px-4 py-2.5 font-sans text-sm text-forest-green disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled
                  className="rounded-full bg-forest-green px-5 py-2.5 font-display text-xs font-bold text-card opacity-50"
                >
                  Enviar
                </button>
              </form>
            </>
          )}
        </section>

        {/* Column 3: member info */}
        <aside className="border-l border-forest-green/5 p-6">
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
    </main>
  );
}
