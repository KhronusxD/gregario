import { PageHeader } from "@/components/admin/PageHeader";
import { EventForm } from "@/components/admin/EventForm";

export default function NewEventPage() {
  return (
    <main className="ml-64 max-w-3xl p-10">
      <PageHeader
        eyebrow="Calendário"
        title="Novo evento"
        description="Cultos, retiros, conferências e cursos — com inscrição opcional."
      />
      <EventForm />
    </main>
  );
}
