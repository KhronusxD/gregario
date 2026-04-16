import Link from "next/link";
import { requireMember } from "@/lib/auth/member-session";
import { createAdminClient } from "@/lib/supabase/admin";

type EventRow = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  max_spots: number | null;
  spots_taken: number;
  is_paid: boolean;
  price: number | null;
};

export default async function MemberEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await requireMember(slug);

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, date, location, max_spots, spots_taken, is_paid, price")
    .eq("workspace_id", member.workspace_id)
    .eq("status", "published")
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true });

  const events = (data ?? []) as EventRow[];

  return (
    <div className="space-y-5 px-5 py-8">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-forest-green">Agenda</h1>
        <p className="mt-1 font-sans text-sm text-forest-green/60">
          Eventos e encontros da igreja.
        </p>
      </header>

      {events.length === 0 ? (
        <p className="rounded-lg bg-card p-6 text-center font-sans text-sm text-forest-green/60 shadow-card">
          Nenhum evento programado.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const d = new Date(e.date);
            const full = e.max_spots != null && e.spots_taken >= e.max_spots;
            return (
              <Link
                key={e.id}
                href={`/${slug}/app/events/${e.id}`}
                className="block rounded-lg bg-card p-5 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-forest-green/60">
                      {d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}
                    </p>
                    <p className="mt-1 font-display text-base font-bold text-forest-green">{e.title}</p>
                    <p className="mt-0.5 font-sans text-xs text-forest-green/70">
                      {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {e.location ?? "a confirmar"}
                    </p>
                  </div>
                  {e.is_paid && e.price != null ? (
                    <span className="rounded-full bg-accent-green/30 px-3 py-1 font-display text-[10px] font-bold text-forest-green">
                      R$ {Number(e.price).toFixed(2).replace(".", ",")}
                    </span>
                  ) : null}
                </div>
                {full ? (
                  <p className="mt-3 inline-block rounded-full bg-red-50 px-3 py-1 font-sans text-[10px] font-bold text-red-700">
                    Vagas esgotadas
                  </p>
                ) : e.max_spots != null ? (
                  <p className="mt-3 font-sans text-xs text-forest-green/60">
                    {e.max_spots - e.spots_taken} vagas restantes
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
