import Link from "next/link";
import { Search, Filter } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin/PageHeader";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_STATUS, initials, formatPhone, type MemberStatus } from "@/lib/members";

type MemberRow = {
  id: string;
  name: string;
  phone: string | null;
  status: MemberStatus;
  photo_url?: string | null;
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: MemberStatus }>;
}) {
  const ctx = await requireWorkspace();
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("members")
    .select("id, name, phone, status, photo_url")
    .eq("workspace_id", ctx.workspace.id)
    .order("name");

  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (params.status) query = query.eq("status", params.status);

  const { data } = await query;
  const members = (data ?? []) as MemberRow[];

  return (
    <main className="ml-64 max-w-[1600px] p-10">
      <PageHeader
        eyebrow="Secretaria"
        title="Membros"
        description="Gestão completa do rebanho: cadastros, situação e vínculos com grupos e ministérios."
        action={{ href: "/dashboard/members/new", label: "+ Novo membro" }}
      />

      <form
        action="/dashboard/members"
        className="mb-8 flex flex-wrap items-center gap-3 rounded-lg bg-card p-4 shadow-card"
      >
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-green/40" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Buscar por nome..."
            className="w-full rounded-full bg-surface py-2.5 pl-12 pr-4 font-sans text-sm text-forest-green placeholder:text-forest-green/40 focus:outline-none focus:ring-2 focus:ring-forest-green/15"
          />
        </div>
        <div className="flex items-center gap-2 text-forest-green/60">
          <Filter className="h-4 w-4" />
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="rounded-full bg-surface px-4 py-2 font-sans text-sm text-forest-green focus:outline-none focus:ring-2 focus:ring-forest-green/15"
          >
            <option value="">Todas situações</option>
            {Object.entries(MEMBER_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-full bg-forest-green px-5 py-2.5 font-display text-sm font-bold text-card active:scale-95"
        >
          Aplicar
        </button>
      </form>

      {members.length === 0 ? (
        <EmptyState
          title="Nenhum membro ainda"
          description="Cadastre manualmente ou importe uma planilha CSV para começar."
          action={{ href: "/dashboard/members/new", label: "Cadastrar o primeiro" }}
        />
      ) : (
        <div className="overflow-hidden rounded-lg bg-card shadow-card">
          <table className="w-full text-left">
            <thead className="bg-surface">
              <tr className="text-[10px] font-bold uppercase tracking-widest text-forest-green/50">
                <th className="px-6 py-4">Membro</th>
                <th className="px-6 py-4">WhatsApp</th>
                <th className="px-6 py-4">Situação</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-forest-green/5 font-sans text-sm">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/members/${m.id}`}
                      className="flex items-center gap-3 font-display font-bold text-forest-green hover:underline"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-action-green to-forest-green text-xs text-card">
                        {initials(m.name)}
                      </span>
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-forest-green/70">{formatPhone(m.phone)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest ${MEMBER_STATUS[m.status]?.tone ?? ""}`}
                    >
                      {MEMBER_STATUS[m.status]?.label ?? m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/members/${m.id}`}
                      className="font-sans text-xs font-bold text-forest-green hover:underline"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
