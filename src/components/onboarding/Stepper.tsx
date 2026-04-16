export function Stepper({ current }: { current: 1 | 2 | 3 | 4 | 5 }) {
  const steps = ["Dados", "FAQ", "WhatsApp", "Membros", "Pronto"];
  return (
    <ol className="mb-10 flex items-center gap-2">
      {steps.map((s, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4 | 5;
        const done = n < current;
        const active = n === current;
        return (
          <li key={s} className="flex flex-1 items-center">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-[11px] font-bold ${
                done
                  ? "bg-accent-green text-forest-green"
                  : active
                    ? "bg-forest-green text-card"
                    : "bg-forest-green/10 text-forest-green/40"
              }`}
            >
              {n}
            </span>
            <span
              className={`ml-2 font-sans text-xs ${
                active ? "font-bold text-forest-green" : "text-forest-green/40"
              }`}
            >
              {s}
            </span>
            {i < steps.length - 1 ? (
              <span className="mx-2 h-px flex-1 bg-forest-green/10" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
