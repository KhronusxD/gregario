import { PageHeader } from "@/components/admin/PageHeader";

export default function SupportPage() {
  return (
    <main className="ml-64 max-w-3xl p-10">
      <PageHeader
        eyebrow="Ajuda"
        title="Suporte"
        description="Atendimento humano em horário comercial via WhatsApp institucional."
      />
      <div className="rounded-lg bg-card p-8 shadow-card">
        <p className="font-sans text-sm text-forest-green/80">
          Envie mensagem para <a href="https://wa.me/5500000000000" className="font-bold text-forest-green hover:underline">(00) 00000-0000</a> ou email para
          {" "}
          <a href="mailto:suporte@gregario.app" className="font-bold text-forest-green hover:underline">suporte@gregario.app</a>.
        </p>
      </div>
    </main>
  );
}
