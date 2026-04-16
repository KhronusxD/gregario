import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/admin/PageHeader";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export default async function GroupsPage() {
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("id, name, description, meeting_day, meeting_time")
    .eq("workspace_id", ctx.workspace.id)
    .order("name");
  const groups = (data ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    meeting_day: string | null;
    meeting_time: string | null;
  }>;

  return (
    <main className="ml-64 max-w-[1400px] p-10">
      <PageHeader
        eyebrow="Comunidade"
        title="Grupos"
        description="Células, GCs e grupos de amizade. Membros solicitam participação pelo app."
        action={{ href: "/dashboard/groups/new", label: "+ Novo grupo" }}
      />

      {groups.length === 0 ? (
        <EmptyState
          title="Sem grupos cadastrados"
          description="Crie grupos de amizade, células ou pequenos ministérios para mapear a vida em comunidade."
          action={{ href: "/dashboard/groups/new", label: "Criar grupo" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/dashboard/groups/${g.id}`}
              className="rounded-lg bg-card p-6 shadow-card transition-all hover:-translate-y-1"
            >
              <h3 className="font-display text-lg font-bold text-forest-green">{g.name}</h3>
              {g.description ? (
                <p className="mt-2 line-clamp-2 font-sans text-sm text-forest-green/70">{g.description}</p>
              ) : null}
              <p className="mt-4 font-sans text-xs text-forest-green/50">
                {g.meeting_day ? `${g.meeting_day} às ${g.meeting_time ?? "—"}` : "Horário não definido"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
