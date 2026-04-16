import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/admin/PageHeader";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatDateBR } from "@/lib/format";

const KIND_LABEL: Record<string, string> = {
  devocional: "Devocional",
  resumo_culto: "Resumo de culto",
  seminario: "Seminário",
};

export default async function ContentPage() {
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_items")
    .select("id, title, kind, status, published_at, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });
  const items = (data ?? []) as Array<{
    id: string;
    title: string;
    kind: string;
    status: string;
    published_at: string | null;
    created_at: string;
  }>;

  return (
    <main className="ml-64 max-w-[1400px] p-10">
      <PageHeader
        eyebrow="Biblioteca"
        title="Conteúdo"
        description="Devocionais, resumos de culto e seminários — publicados no app do membro."
        action={{ href: "/dashboard/content/new", label: "+ Novo conteúdo" }}
      />

      {items.length === 0 ? (
        <EmptyState
          title="Biblioteca vazia"
          description="Publique um devocional semanal ou o resumo do último culto para alimentar o app do membro."
          action={{ href: "/dashboard/content/new", label: "Criar conteúdo" }}
        />
      ) : (
        <div className="overflow-hidden rounded-lg bg-card shadow-card">
          <table className="w-full text-left">
            <thead className="bg-surface text-[10px] font-bold uppercase tracking-widest text-forest-green/50">
              <tr>
                <th className="px-6 py-4">Título</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Publicado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-forest-green/5 font-sans text-sm">
                  <td className="px-6 py-4 font-display font-bold text-forest-green">
                    <Link href={`/dashboard/content/${i.id}`} className="hover:underline">
                      {i.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-forest-green/70">{KIND_LABEL[i.kind] ?? i.kind}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-forest-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-forest-green/70">
                      {i.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-forest-green/60">{formatDateBR(i.published_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
