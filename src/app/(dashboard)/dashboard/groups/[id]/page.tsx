import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!group) notFound();

  const { data: members } = await supabase
    .from("members")
    .select("id, name, phone")
    .eq("group_id", id);

  return (
    <main className="ml-64 max-w-3xl p-10">
      <PageHeader
        eyebrow="Comunidade"
        title={group.name}
        description={group.description ?? undefined}
        action={
          <Link
            href="/dashboard/groups"
            className="rounded-full border border-forest-green/10 px-4 py-2 font-sans text-xs font-bold text-forest-green/70 hover:bg-forest-green/[0.06]"
          >
            Voltar
          </Link>
        }
      />

      <section className="rounded-lg bg-card p-6 shadow-card">
        <h3 className="mb-4 font-display text-lg font-bold text-forest-green">
          Membros ({members?.length ?? 0})
        </h3>
        {(members ?? []).length === 0 ? (
          <p className="font-sans text-sm text-forest-green/60">
            Nenhum membro vinculado ainda. Use a página do membro para vincular.
          </p>
        ) : (
          <ul className="divide-y divide-forest-green/5">
            {(members ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3 font-sans text-sm">
                <Link href={`/dashboard/members/${m.id}`} className="font-display font-bold text-forest-green hover:underline">
                  {m.name}
                </Link>
                <span className="text-forest-green/60">{m.phone ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
