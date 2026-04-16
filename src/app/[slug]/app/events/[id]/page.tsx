import { notFound } from "next/navigation";
import Link from "next/link";
import { requireMember } from "@/lib/auth/member-session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  registerForEventAction,
  cancelRegistrationAction,
} from "@/actions/member-events";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  end_date: string | null;
  location: string | null;
  address: string | null;
  max_spots: number | null;
  spots_taken: number;
  is_paid: boolean;
  price: number | null;
};

export default async function MemberEventDetail({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const member = await requireMember(slug);

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, description, date, end_date, location, address, max_spots, spots_taken, is_paid, price")
    .eq("id", id)
    .eq("workspace_id", member.workspace_id)
    .maybeSingle();

  if (!event) notFound();
  const e = event as unknown as EventRow;

  const { data: reg } = await supabase
    .from("event_registrations")
    .select("status")
    .eq("event_id", id)
    .eq("member_id", member.id)
    .maybeSingle();
  const registration = reg as { status: string } | null;
  const isRegistered = registration?.status === "confirmed";

  const d = new Date(e.date);
  const full = e.max_spots != null && e.spots_taken >= e.max_spots;

  return (
    <div className="space-y-5 px-5 py-6">
      <Link href={`/${slug}/app/events`} className="font-sans text-xs font-bold text-forest-green/60">
        ← Voltar
      </Link>

      <header>
        <p className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
          {d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-forest-green">{e.title}</h1>
      </header>

      <section className="space-y-3 rounded-lg bg-card p-5 shadow-card">
        <Row
          label="Horário"
          value={d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        />
        <Row label="Local" value={e.location ?? "A confirmar"} />
        {e.address ? <Row label="Endereço" value={e.address} /> : null}
        {e.max_spots != null ? (
          <Row
            label="Vagas"
            value={full ? "Esgotadas" : `${e.max_spots - e.spots_taken} disponíveis`}
          />
        ) : null}
        {e.is_paid && e.price != null ? (
          <Row label="Investimento" value={`R$ ${Number(e.price).toFixed(2).replace(".", ",")}`} />
        ) : null}
      </section>

      {e.description ? (
        <section className="rounded-lg bg-card p-5 font-sans text-sm leading-relaxed text-forest-green/80 shadow-card">
          {e.description}
        </section>
      ) : null}

      <form
        action={isRegistered ? cancelRegistrationAction : registerForEventAction}
        className="sticky bottom-20"
      >
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="eventId" value={id} />
        <button
          type="submit"
          disabled={!isRegistered && full}
          className={`w-full rounded-full px-6 py-4 font-display text-sm font-bold active:scale-95 disabled:opacity-60 ${
            isRegistered
              ? "bg-forest-green/[0.06] text-forest-green"
              : "bg-gradient-to-br from-forest-green to-action-green text-card"
          }`}
        >
          {isRegistered ? "Cancelar inscrição" : full ? "Vagas esgotadas" : "Me inscrever"}
        </button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="font-sans text-xs font-bold uppercase tracking-widest text-forest-green/50">
        {label}
      </p>
      <p className="font-sans text-sm text-forest-green">{value}</p>
    </div>
  );
}
