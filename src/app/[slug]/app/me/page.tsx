import { requireMember } from "@/lib/auth/member-session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  updateMemberProfileAction,
  memberSignOutAction,
} from "@/actions/member-profile";

type ContributionRow = {
  id: string;
  amount: number;
  date: string;
  payment_method: string;
};

type MemberDetail = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  status: string;
};

export default async function MemberMePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await requireMember(slug);

  const supabase = createAdminClient();
  const [detailRes, contribRes] = await Promise.all([
    supabase
      .from("members")
      .select("id, name, phone, email, address, neighborhood, city, status")
      .eq("id", member.id)
      .maybeSingle(),
    supabase
      .from("contributions")
      .select("id, amount, date, payment_method")
      .eq("member_id", member.id)
      .eq("status", "confirmed")
      .order("date", { ascending: false })
      .limit(5),
  ]);

  const detail = detailRes.data as MemberDetail | null;
  const contributions = (contribRes.data ?? []) as ContributionRow[];

  if (!detail) return null;

  return (
    <div className="space-y-6 px-5 py-8">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-forest-green">Minha conta</h1>
        <p className="mt-1 font-sans text-sm text-forest-green/60">
          Mantenha seus dados atualizados.
        </p>
      </header>

      <form
        action={updateMemberProfileAction}
        className="space-y-4 rounded-lg bg-card p-5 shadow-card"
      >
        <input type="hidden" name="slug" value={slug} />
        <Field label="Nome" name="name" defaultValue={detail.name} required />
        <Field label="E-mail" name="email" type="email" defaultValue={detail.email ?? ""} />
        <Field label="Endereço" name="address" defaultValue={detail.address ?? ""} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bairro" name="neighborhood" defaultValue={detail.neighborhood ?? ""} />
          <Field label="Cidade" name="city" defaultValue={detail.city ?? ""} />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card active:scale-95"
        >
          Salvar alterações
        </button>
      </form>

      <section>
        <h2 className="mb-3 font-display text-sm font-bold text-forest-green">
          Minhas contribuições
        </h2>
        {contributions.length === 0 ? (
          <p className="rounded-lg bg-card p-5 text-center font-sans text-sm text-forest-green/60 shadow-card">
            Nenhuma contribuição registrada ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {contributions.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-card p-4 shadow-card"
              >
                <div>
                  <p className="font-display text-sm font-bold text-forest-green">
                    R$ {Number(c.amount).toFixed(2).replace(".", ",")}
                  </p>
                  <p className="font-sans text-xs text-forest-green/60">
                    {new Date(c.date).toLocaleDateString("pt-BR")} · {c.payment_method}
                  </p>
                </div>
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-accent-green">
                  Confirmado
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={memberSignOutAction} className="pt-4">
        <input type="hidden" name="slug" value={slug} />
        <button
          type="submit"
          className="w-full rounded-full border border-forest-green/10 bg-card px-6 py-3 font-display text-xs font-bold text-forest-green/60 hover:text-forest-green"
        >
          Sair
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full rounded-sm border border-forest-green/10 bg-surface px-3 py-2 font-sans text-sm text-forest-green"
      />
    </div>
  );
}
