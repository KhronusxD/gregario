import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { deleteEventAction } from "@/actions/events";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!event) notFound();

  const { data: regs } = await supabase
    .from("event_registrations")
    .select("id, status, member:member_id(name, phone)")
    .eq("event_id", id);

  const registrations = (regs ?? []) as unknown as Array<{
    id: string;
    status: string;
    member: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null;
  }>;

  const deleteBound = deleteEventAction.bind(null, id);

  return (
    <main className="ml-64 max-w-4xl p-10">
      <PageHeader
        eyebrow="Calendário"
        title={event.title}
        description={event.description ?? undefined}
        action={
          <div className="flex gap-3">
            <Link
              href="/dashboard/events"
              className="rounded-full border border-forest-green/10 px-4 py-2 font-sans text-xs font-bold text-forest-green/70 hover:bg-forest-green/[0.06]"
            >
              Voltar
            </Link>
            <form action={deleteBound}>
              <button className="rounded-full border border-red-200 px-4 py-2 font-sans text-xs font-bold text-red-600 hover:bg-red-50">
                Apagar
              </button>
            </form>
          </div>
        }
      />

      <section className="mb-8 grid gap-4 rounded-lg bg-card p-6 shadow-card md:grid-cols-3">
        <Info label="Início" value={new Date(event.starts_at).toLocaleString("pt-BR")} />
        <Info label="Local" value={event.location ?? "—"} />
        <Info label="Capacidade" value={event.capacity ? `${event.capacity}` : "Ilimitada"} />
      </section>

      <section className="rounded-lg bg-card p-6 shadow-card">
        <h3 className="mb-4 font-display text-lg font-bold text-forest-green">
          Inscrições ({registrations.length})
        </h3>
        {registrations.length === 0 ? (
          <p className="font-sans text-sm text-forest-green/60">Nenhum inscrito ainda.</p>
        ) : (
          <ul className="divide-y divide-forest-green/5">
            {registrations.map((r) => {
              const m = Array.isArray(r.member) ? r.member[0] : r.member;
              return (
                <li key={r.id} className="flex items-center justify-between py-3 font-sans text-sm">
                  <span className="text-forest-green">{m?.name ?? "—"}</span>
                  <span className="text-forest-green/60">{m?.phone ?? ""}</span>
                  <span className="rounded-full bg-forest-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-forest-green/70">
                    {r.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-forest-green/50">{label}</p>
      <p className="mt-1 font-display text-base font-bold text-forest-green">{value}</p>
    </div>
  );
}
