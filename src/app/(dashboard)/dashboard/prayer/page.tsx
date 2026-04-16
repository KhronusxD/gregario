import { PageHeader, EmptyState } from "@/components/admin/PageHeader";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatDateBR } from "@/lib/format";

export default async function PrayerPage() {
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("prayer_requests")
    .select("id, title, body, visibility, created_at, author:author_id(name)")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const requests = (data ?? []) as Array<{
    id: string;
    title: string;
    body: string | null;
    visibility: string;
    created_at: string;
    author: { name: string } | { name: string }[] | null;
  }>;

  return (
    <main className="ml-64 max-w-[1200px] p-10">
      <PageHeader
        eyebrow="Comunidade"
        title="Mural de oração"
        description="Pedidos partilhados pelos membros pelo app. Liderança tem visão completa."
      />

      {requests.length === 0 ? (
        <EmptyState
          title="Sem pedidos no momento"
          description="Assim que os membros começarem a usar o app, os pedidos de oração aparecem aqui."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const author = Array.isArray(r.author) ? r.author[0] : r.author;
            return (
              <article key={r.id} className="rounded-lg bg-card p-6 shadow-card">
                <header className="mb-2 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-forest-green">{r.title}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-forest-green/50">
                    {r.visibility}
                  </span>
                </header>
                <p className="whitespace-pre-wrap font-sans text-sm text-forest-green/70">{r.body ?? ""}</p>
                <footer className="mt-4 flex items-center justify-between font-sans text-xs text-forest-green/50">
                  <span>{author?.name ?? "Anônimo"}</span>
                  <span>{formatDateBR(r.created_at)}</span>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
