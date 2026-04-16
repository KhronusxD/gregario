import {
  type LucideIcon,
  UserPlus,
  Eye,
  Heart,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  CalendarDays,
} from "lucide-react";
import { requireWorkspace } from "@/lib/auth/dal";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardHome() {
  const ctx = await requireWorkspace();
  const pastorName =
    (ctx.user.user_metadata?.pastor_name as string | undefined)?.split(" ")[0] ??
    "pastor";

  return (
    <main className="ml-64 max-w-[1600px] p-10">
      <header className="mb-12">
        <h2 className="mb-2 font-display text-4xl font-extrabold tracking-tight text-forest-green">
          {greeting()}, {pastorName}.
        </h2>
        <p className="font-sans font-medium text-forest-green/70">
          Aqui está o resumo pastoral da{" "}
          <span className="font-bold text-forest-green">{ctx.workspace.name}</span>{" "}
          hoje.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Saúde da Igreja */}
        <section className="col-span-12 flex flex-col justify-between rounded-lg bg-card p-8 shadow-card lg:col-span-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-forest-green">
                Saúde da Igreja
              </h3>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-forest-green/50">
                Crescimento &amp; Engajamento
              </p>
            </div>
            <button className="flex items-center gap-1 font-sans text-sm font-bold text-forest-green hover:underline">
              Relatórios
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <MetricTile
              icon={UserPlus}
              value="1.284"
              label="Membros Ativos"
              delta="+12% este mês"
              trend="up"
            />
            <MetricTile
              icon={Eye}
              value="42"
              label="Novos Visitantes"
              delta="-2% vs semana passada"
              trend="down"
            />
            <MetricTile
              icon={Heart}
              value="78%"
              label="Engajamento"
              delta="Pico no domingo"
              trend="up"
            />
          </div>
        </section>

        {/* Tesouraria */}
        <section className="relative col-span-12 overflow-hidden rounded-lg bg-gradient-to-br from-forest-green to-action-green p-8 text-card shadow-card lg:col-span-4">
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-card/5 blur-3xl" />
          <h3 className="mb-1 font-display text-xl font-bold">Tesouraria</h3>
          <p className="mb-10 text-[11px] font-semibold uppercase tracking-widest text-card/70">
            Contribuições do mês
          </p>
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-end justify-between">
                <span className="font-sans text-sm font-medium text-card/80">
                  Arrecadado
                </span>
                <span className="font-display text-2xl font-extrabold">
                  R$ 42.850
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-card/10">
                <div
                  className="h-full rounded-full bg-accent-green"
                  style={{ width: "72%" }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-tight text-card/70">
                <span>Meta: R$ 60.000</span>
                <span>72% da meta</span>
              </div>
            </div>
            <div className="border-t border-card/10 pt-6">
              <div className="flex items-center gap-4">
                <StatPill label="Ticket médio" value="R$ 142" />
                <StatPill label="Novos dizimistas" value="14" />
              </div>
            </div>
          </div>
        </section>

        {/* Alertas Pastorais */}
        <section className="col-span-12 space-y-6 lg:col-span-7">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card/70 backdrop-blur-xl ring-1 ring-forest-green/10">
                <Sparkles className="h-5 w-5 text-forest-green" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-forest-green">
                  Alertas Pastorais
                </h3>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-forest-green/50">
                  Membros precisando de atenção
                </p>
              </div>
            </div>
            <span className="rounded-full bg-forest-green px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-card">
              3 prioridade
            </span>
          </div>
          <AlarmCard
            initials="ER"
            name="Elena Rodrigues"
            meta="Membro desde 2018"
            description="Ausente nos últimos 3 cultos e 2 reuniões de célula. A IA sugere uma ligação para checar saúde ou transporte."
            action={Phone}
          />
          <AlarmCard
            initials="MT"
            name="Marcus T."
            meta="Novo visitante"
            description="Pico de engajamento: Marcus veio a 4 eventos em 2 semanas. Hora de convidar para a Classe Fundamentos."
            action={Mail}
          />
        </section>

        {/* Agenda (empty state) */}
        <section className="group relative col-span-12 rounded-lg border border-dashed border-forest-green/20 bg-card/50 p-8 lg:col-span-5">
          <div className="absolute right-6 top-6 flex -space-x-2">
            <span className="h-8 w-8 rounded-full border-2 border-surface bg-accent-green/40" />
            <span className="h-8 w-8 rounded-full border-2 border-surface bg-action-green/40" />
            <span className="h-8 w-8 rounded-full border-2 border-surface bg-forest-green/10" />
          </div>
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-forest-green/[0.06] transition-transform duration-500 group-hover:scale-110">
              <CalendarDays className="h-9 w-9 text-forest-green/40" />
            </div>
            <h3 className="mb-2 font-display text-xl font-bold text-forest-green">
              Agenda da Comunidade
            </h3>
            <p className="mb-8 max-w-xs font-sans text-sm text-forest-green/70">
              Sem eventos nas próximas 48h. Use este tempo para pastoreio ou
              planejamento administrativo.
            </p>
            <button className="rounded-full bg-forest-green/[0.06] px-6 py-2.5 font-display text-sm font-bold text-forest-green transition-colors hover:bg-forest-green/[0.1]">
              Criar evento
            </button>
          </div>
        </section>
      </div>

      {/* Distribuição de Frequência */}
      <section className="mt-12 rounded-lg bg-card p-8 shadow-card">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-forest-green">
              Distribuição de Frequência
            </h3>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-forest-green/50">
              Tendência semanal (últimos 90 dias)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <LegendSwatch color="bg-forest-green" label="Culto" />
            <LegendSwatch color="bg-accent-green" label="Juventude" />
          </div>
        </div>
        <div className="flex h-48 items-end gap-2 overflow-hidden px-4">
          {attendanceBars.map((bar, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-sm ${bar.color}`}
              style={{ height: `${bar.height}%` }}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-between px-4 text-[10px] font-bold uppercase tracking-widest text-forest-green/50">
          <span>Semana 1</span>
          <span>Semana 4</span>
          <span>Semana 8</span>
          <span>Semana 12 (atual)</span>
        </div>
      </section>
    </main>
  );
}

const attendanceBars = [
  { height: 40, color: "bg-forest-green/10" },
  { height: 55, color: "bg-forest-green/30" },
  { height: 45, color: "bg-forest-green/10" },
  { height: 70, color: "bg-forest-green/30" },
  { height: 90, color: "bg-accent-green" },
  { height: 65, color: "bg-forest-green/30" },
  { height: 35, color: "bg-forest-green/10" },
  { height: 85, color: "bg-forest-green" },
  { height: 50, color: "bg-forest-green/10" },
  { height: 60, color: "bg-forest-green/30" },
  { height: 40, color: "bg-forest-green/10" },
  { height: 75, color: "bg-accent-green" },
  { height: 95, color: "bg-forest-green" },
  { height: 55, color: "bg-forest-green/10" },
  { height: 65, color: "bg-forest-green/30" },
  { height: 45, color: "bg-forest-green/10" },
];

function MetricTile({
  icon: Icon,
  value,
  label,
  delta,
  trend,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  delta: string;
  trend: "up" | "down";
}) {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  return (
    <div className="flex flex-col gap-1 rounded-md bg-surface p-6">
      <Icon className="mb-2 h-7 w-7 text-accent-green" />
      <span className="font-display text-3xl font-black text-forest-green">
        {value}
      </span>
      <span className="font-sans text-sm font-medium text-forest-green/70">
        {label}
      </span>
      <div className="mt-4 flex items-center gap-1 font-sans text-xs font-bold text-forest-green/60">
        <TrendIcon className="h-3.5 w-3.5" />
        {delta}
      </div>
    </div>
  );
}

function AlarmCard({
  initials,
  name,
  meta,
  description,
  action: ActionIcon,
}: {
  initials: string;
  name: string;
  meta: string;
  description: string;
  action: LucideIcon;
}) {
  return (
    <div className="group flex items-center gap-6 rounded-lg bg-card p-6 shadow-card transition-all duration-300 hover:translate-x-2">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-action-green to-forest-green font-display text-lg font-bold text-card ring-4 ring-forest-green/5">
        {initials}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-lg font-bold text-forest-green">
            {name}
          </h4>
          <span className="font-sans text-xs font-semibold text-forest-green/50">
            {meta}
          </span>
        </div>
        <p className="mt-1 font-sans text-sm leading-relaxed text-forest-green/70">
          {description}
        </p>
      </div>
      <button className="rounded-md bg-surface p-3 text-forest-green shadow-card transition-all hover:bg-gradient-to-br hover:from-forest-green hover:to-action-green hover:text-card active:scale-90">
        <ActionIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-sm bg-card/10 p-4">
      <p className="text-[10px] font-bold uppercase text-card/70">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-[10px] font-bold uppercase text-forest-green/50">
        {label}
      </span>
    </div>
  );
}
