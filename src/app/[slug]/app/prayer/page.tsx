import { requireMember } from "@/lib/auth/member-session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createPrayerRequestAction,
  intercedeAction,
} from "@/actions/member-prayer";

type PrayerRow = {
  id: string;
  body: string;
  is_anonymous: boolean;
  intercessors: number;
  created_at: string;
  member: { name: string } | { name: string }[] | null;
};

function firstName(name: string) {
  return name.split(" ")[0];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "agora";
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default async function MemberPrayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await requireMember(slug);

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("prayer_requests")
    .select("id, body, is_anonymous, intercessors, created_at, member:members(name)")
    .eq("workspace_id", member.workspace_id)
    .eq("status", "open")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(50);

  const requests = (data ?? []) as unknown as PrayerRow[];

  return (
    <div className="space-y-5 px-5 py-8">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-forest-green">
          Mural de oração
        </h1>
        <p className="mt-1 font-sans text-sm text-forest-green/60">
          Ore pelos irmãos e compartilhe seus pedidos.
        </p>
      </header>

      <form
        action={createPrayerRequestAction}
        className="space-y-3 rounded-lg bg-card p-5 shadow-card"
      >
        <input type="hidden" name="slug" value={slug} />
        <textarea
          name="body"
          rows={3}
          required
          minLength={3}
          maxLength={500}
          placeholder="Compartilhe seu pedido de oração..."
          className="w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2 font-sans text-sm text-forest-green"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 font-sans text-xs text-forest-green/70">
            <input type="checkbox" name="anonymous" className="h-4 w-4" />
            Anônimo
          </label>
          <button
            type="submit"
            className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2 font-display text-xs font-bold text-card active:scale-95"
          >
            Publicar
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {requests.length === 0 ? (
          <p className="rounded-lg bg-card p-6 text-center font-sans text-sm text-forest-green/60 shadow-card">
            Nenhum pedido no momento. Seja o primeiro a compartilhar.
          </p>
        ) : (
          requests.map((r) => {
            const m = Array.isArray(r.member) ? r.member[0] : r.member;
            const author = r.is_anonymous ? "Anônimo" : firstName(m?.name ?? "Irmão");
            return (
              <article key={r.id} className="rounded-lg bg-card p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm font-bold text-forest-green">{author}</p>
                  <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-forest-green/40">
                    {timeAgo(r.created_at)}
                  </p>
                </div>
                <p className="mt-2 font-sans text-sm text-forest-green/80">{r.body}</p>
                <form action={intercedeAction} className="mt-3 flex items-center justify-between">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="requestId" value={r.id} />
                  <p className="font-sans text-xs text-forest-green/60">
                    {r.intercessors} {r.intercessors === 1 ? "intercessor" : "intercessores"}
                  </p>
                  <button
                    type="submit"
                    className="rounded-full bg-accent-green/20 px-4 py-1.5 font-display text-xs font-bold text-forest-green hover:bg-accent-green/30 active:scale-95"
                  >
                    🙏 Estou orando
                  </button>
                </form>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
