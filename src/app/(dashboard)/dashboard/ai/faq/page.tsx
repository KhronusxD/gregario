import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { FaqCreateForm, FaqRow } from "@/components/ai/FaqEditor";

export const dynamic = "force-dynamic";

type FaqRecord = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  active: boolean;
  created_at: string;
};

export default async function FaqPage() {
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_faq")
    .select("id, question, answer, category, active, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });
  const list = (data ?? []) as FaqRecord[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-extrabold text-forest-green">FAQ da IA</h2>
        <p className="mt-1 font-sans text-sm text-forest-green/60">
          Perguntas frequentes que a IA usa como resposta direta. Atualize sempre que houver mudança de
          horário, evento fixo ou dúvida recorrente.
        </p>
      </div>

      <FaqCreateForm />

      {list.length === 0 ? (
        <p className="rounded-lg bg-card p-6 font-sans text-sm text-forest-green/50 shadow-card">
          Nenhuma FAQ cadastrada. Comece adicionando as perguntas que chegam com mais frequência.
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <FaqRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
