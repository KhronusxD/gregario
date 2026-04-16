import { notFound } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { MemberForm } from "@/components/admin/MemberForm";
import { updateMemberAction, deleteMemberAction } from "@/actions/members";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/members";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  if (!data) notFound();

  const updateBound = updateMemberAction.bind(null, id);
  const deleteBound = deleteMemberAction.bind(null, id);

  return (
    <main className="ml-64 max-w-4xl p-10">
      <PageHeader
        eyebrow="Secretaria / Membros"
        title={data.name}
        description="Dados pessoais, notas pastorais e histórico. O app do membro usa as mesmas informações."
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/members"
              className="rounded-full border border-forest-green/10 px-4 py-2 font-sans text-xs font-bold text-forest-green/70 hover:bg-forest-green/[0.06]"
            >
              Voltar
            </Link>
            <form action={deleteBound}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 font-sans text-xs font-bold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Apagar
              </button>
            </form>
          </div>
        }
      />

      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-action-green to-forest-green font-display text-lg font-bold text-card">
          {initials(data.name)}
        </span>
        <div>
          <p className="font-sans text-sm text-forest-green/70">
            Cadastrado em{" "}
            {data.created_at
              ? new Date(data.created_at).toLocaleDateString("pt-BR")
              : "—"}
          </p>
        </div>
      </div>

      <MemberForm action={updateBound} initial={data} submitLabel="Salvar alterações" />
    </main>
  );
}
