import Link from "next/link";
import { requireMember } from "@/lib/auth/member-session";
import { getWorkspaceBySlug } from "@/lib/workspace";
import { createAdminClient } from "@/lib/supabase/admin";

type EventRow = {
  id: string;
  title: string;
  date: string;
  location: string | null;
};

type ContentRow = {
  id: string;
  title: string;
  type: string;
  published_at: string | null;
};

export default async function MemberHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [workspace, member] = await Promise.all([
    getWorkspaceBySlug(slug),
    requireMember(slug),
  ]);
  if (!workspace) return null;

  const supabase = createAdminClient();
  const [eventsRes, contentRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, date, location")
      .eq("workspace_id", workspace.id)
      .eq("status", "published")
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(3),
    supabase
      .from("content_items")
      .select("id, title, type, published_at")
      .eq("workspace_id", workspace.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
  ]);

  const events = (eventsRes.data ?? []) as EventRow[];
  const content = (contentRes.data ?? []) as ContentRow[];
  const firstName = member.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-6 px-5 py-8">
      <header>
        <p className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
          {greeting},
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-forest-green">
          {firstName}
        </h1>
      </header>

      {workspace.verse_of_day ? (
        <section className="rounded-lg bg-gradient-to-br from-forest-green to-action-green p-5 text-card shadow-card">
          <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-card/70">
            Versículo do dia
          </p>
          <p className="mt-2 font-display text-base font-bold leading-snug">
            {workspace.verse_of_day}
          </p>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-forest-green">Próximos eventos</h2>
          <Link href={`/${slug}/app/events`} className="font-sans text-xs font-bold text-forest-green/60">
            Ver tudo →
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="rounded-lg bg-card p-4 text-center font-sans text-sm text-forest-green/60 shadow-card">
            Nenhum evento programado.
          </p>
        ) : (
          <div className="space-y-2">
            {events.map((e) => {
              const d = new Date(e.date);
              return (
                <Link
                  key={e.id}
                  href={`/${slug}/app/events/${e.id}`}
                  className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-card"
                >
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-md bg-accent-green/30 text-forest-green">
                    <span className="font-display text-xs font-bold">
                      {d.toLocaleDateString("pt-BR", { month: "short" }).slice(0, 3)}
                    </span>
                    <span className="font-display text-base font-extrabold leading-none">
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-sm font-bold text-forest-green">{e.title}</p>
                    <p className="font-sans text-xs text-forest-green/60">
                      {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {e.location ?? "a confirmar"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-bold text-forest-green">Conteúdo recente</h2>
        {content.length === 0 ? (
          <p className="rounded-lg bg-card p-4 text-center font-sans text-sm text-forest-green/60 shadow-card">
            A igreja ainda não publicou conteúdos.
          </p>
        ) : (
          <ul className="space-y-2">
            {content.map((c) => (
              <li
                key={c.id}
                className="rounded-lg bg-card p-4 shadow-card"
              >
                <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-forest-green/50">
                  {c.type.replace("_", " ")}
                </p>
                <p className="mt-1 font-display text-sm font-bold text-forest-green">{c.title}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
