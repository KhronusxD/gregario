type Execution = {
  id: string;
  status: "running" | "done" | "error";
  error: string | null;
  created_at: string;
};

const STATUS: Record<Execution["status"], { label: string; cls: string }> = {
  running: { label: "Rodando", cls: "bg-yellow-400/20 text-yellow-700" },
  done: { label: "Concluído", cls: "bg-action-green/15 text-action-green" },
  error: { label: "Erro", cls: "bg-red-500/15 text-red-600" },
};

export function FlowExecutions({ items }: { items: Execution[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg bg-card p-4 font-sans text-xs text-forest-green/50 shadow-card">
        Nenhuma execução registrada ainda. O histórico aparece aqui quando o fluxo disparar.
      </p>
    );
  }
  return (
    <div className="rounded-lg bg-card p-4 shadow-card">
      <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-forest-green/60">
        Últimas execuções
      </h3>
      <ul className="space-y-2">
        {items.map((e) => {
          const badge = STATUS[e.status];
          const time = new Date(e.created_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <li
              key={e.id}
              className="flex items-start justify-between gap-3 border-b border-forest-green/5 pb-2 last:border-b-0 last:pb-0"
            >
              <div>
                <span className={`rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest ${badge.cls}`}>
                  {badge.label}
                </span>
                {e.error ? (
                  <p className="mt-1 font-sans text-xs text-red-600">{e.error}</p>
                ) : null}
              </div>
              <span className="font-mono text-[11px] text-forest-green/50">{time}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
