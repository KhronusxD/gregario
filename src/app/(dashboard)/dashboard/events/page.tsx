import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin/PageHeader";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export default async function EventsPage() {
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, description, starts_at, location, capacity, registration_open")
    .eq("workspace_id", ctx.workspace.id)
    .order("starts_at");

  const events = (data ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    starts_at: string;
    location: string | null;
    capacity: number | null;
    registration_open: boolean;
  }>;

  return (
    <main className="ml-64 max-w-[1400px] p-10">
      <PageHeader
        eyebrow="Calendário"
        title="Eventos"
        description="Agenda pública, inscrições e check-in. O app do membro consome esses dados em tempo real."
        action={{ href: "/dashboard/events/new", label: "+ Novo evento" }}
      />

      {events.length === 0 ? (
        <EmptyState
          title="Agenda limpa"
          description="Crie um culto, retiro ou curso e abra inscrições pelo app e pela secretaria IA."
          action={{ href: "/dashboard/events/new", label: "Criar evento" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/events/${e.id}`}
              className="group flex flex-col justify-between rounded-lg bg-card p-6 shadow-card transition-all hover:-translate-y-1"
            >
              <div>
                <h3 className="font-display text-lg font-bold text-forest-green">{e.title}</h3>
                {e.description ? (
                  <p className="mt-2 line-clamp-3 font-sans text-sm text-forest-green/70">{e.description}</p>
                ) : null}
              </div>
              <div className="mt-6 space-y-1.5 font-sans text-xs text-forest-green/60">
                <Info icon={CalendarDays} text={new Date(e.starts_at).toLocaleString("pt-BR")} />
                {e.location ? <Info icon={MapPin} text={e.location} /> : null}
                {e.capacity ? <Info icon={Users} text={`${e.capacity} vagas`} /> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function Info({ icon: Icon, text }: { icon: typeof CalendarDays; text: string }) {
  return (
    <p className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-accent-green" />
      {text}
    </p>
  );
}
