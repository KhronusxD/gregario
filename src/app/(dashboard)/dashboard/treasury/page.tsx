import { PageHeader } from "@/components/admin/PageHeader";
import { ContributionForm } from "@/components/admin/ContributionForm";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatDateBR, startOfMonthISO, endOfMonthISO } from "@/lib/format";

const CATEGORY_LABEL: Record<string, string> = {
  dizimo: "Dízimo",
  oferta: "Oferta",
  missoes: "Missões",
  construcao: "Construção",
  outros: "Outros",
};

export default async function TreasuryPage() {
  const ctx = await requireRole(["admin", "tesoureiro"]);
  const supabase = await createClient();

  const monthStart = startOfMonthISO();
  const monthEnd = endOfMonthISO();

  const [{ data: contribs }, { data: members }] = await Promise.all([
    supabase
      .from("contributions")
      .select("id, amount, category, method, paid_at, note, member:member_id(name)")
      .eq("workspace_id", ctx.workspace.id)
      .gte("paid_at", monthStart.slice(0, 10))
      .lte("paid_at", monthEnd.slice(0, 10))
      .order("paid_at", { ascending: false }),
    supabase
      .from("members")
      .select("id, name")
      .eq("workspace_id", ctx.workspace.id)
      .order("name"),
  ]);

  const rows = (contribs ?? []) as Array<{
    id: string;
    amount: number;
    category: string;
    method: string;
    paid_at: string;
    note: string | null;
    member: { name: string } | { name: string }[] | null;
  }>;

  const total = rows.reduce((acc, r) => acc + Number(r.amount), 0);
  const byCategory = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + Number(r.amount);
    return acc;
  }, {});

  return (
    <main className="ml-64 max-w-[1600px] p-10">
      <PageHeader
        eyebrow="Financeiro"
        title="Tesouraria"
        description="Lançamentos do mês corrente — dízimos, ofertas e outras contribuições."
      />

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <KPI label="Arrecadado no mês" value={formatBRL(total)} highlight />
        <KPI label="Dízimos" value={formatBRL(byCategory.dizimo ?? 0)} />
        <KPI label="Ofertas" value={formatBRL(byCategory.oferta ?? 0)} />
        <KPI label="Missões" value={formatBRL(byCategory.missoes ?? 0)} />
      </div>

      <div className="mb-8">
        <ContributionForm members={(members ?? []) as { id: string; name: string }[]} />
      </div>

      <div className="overflow-hidden rounded-lg bg-card shadow-card">
        <table className="w-full text-left">
          <thead className="bg-surface">
            <tr className="text-[10px] font-bold uppercase tracking-widest text-forest-green/50">
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Membro</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Forma</th>
              <th className="px-6 py-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center font-sans text-sm text-forest-green/50">
                  Nenhum lançamento neste mês.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const member = Array.isArray(r.member) ? r.member[0] : r.member;
                return (
                  <tr key={r.id} className="border-t border-forest-green/5 font-sans text-sm">
                    <td className="px-6 py-4 text-forest-green/70">{formatDateBR(r.paid_at)}</td>
                    <td className="px-6 py-4 text-forest-green">{member?.name ?? "—"}</td>
                    <td className="px-6 py-4 text-forest-green/80">{CATEGORY_LABEL[r.category] ?? r.category}</td>
                    <td className="px-6 py-4 text-forest-green/70 capitalize">{r.method}</td>
                    <td className="px-6 py-4 text-right font-display font-bold text-forest-green">
                      {formatBRL(r.amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function KPI({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg p-6 ${
        highlight
          ? "bg-gradient-to-br from-forest-green to-action-green text-card shadow-card"
          : "bg-card shadow-card"
      }`}
    >
      <p
        className={`text-[11px] font-bold uppercase tracking-widest ${
          highlight ? "text-card/70" : "text-forest-green/50"
        }`}
      >
        {label}
      </p>
      <p className={`mt-2 font-display text-3xl font-black ${highlight ? "text-card" : "text-forest-green"}`}>
        {value}
      </p>
    </div>
  );
}
