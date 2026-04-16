import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatDateBR } from "@/lib/format";

export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <main className="ml-64 max-w-3xl p-10">
      <PageHeader
        eyebrow="Biblioteca"
        title={data.title}
        description={`${data.kind} · publicado em ${formatDateBR(data.published_at)}`}
        action={
          <Link
            href="/dashboard/content"
            className="rounded-full border border-forest-green/10 px-4 py-2 font-sans text-xs font-bold text-forest-green/70 hover:bg-forest-green/[0.06]"
          >
            Voltar
          </Link>
        }
      />
      <article className="whitespace-pre-wrap rounded-lg bg-card p-8 font-sans text-sm text-forest-green/80 shadow-card">
        {data.body ?? "Sem texto."}
      </article>
    </main>
  );
}
