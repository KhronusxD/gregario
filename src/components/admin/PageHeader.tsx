import Link from "next/link";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string } | React.ReactNode;
}) {
  return (
    <header className="mb-10 flex items-end justify-between gap-8">
      <div>
        {eyebrow ? (
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/50">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-forest-green">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl font-sans text-sm text-forest-green/70">
            {description}
          </p>
        ) : null}
      </div>
      {action
        ? typeof action === "object" && action !== null && "href" in action
          ? (
              <Link
                href={(action as { href: string }).href}
                className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2.5 font-display text-sm font-bold text-card transition-transform active:scale-95"
              >
                {(action as { label: string }).label}
              </Link>
            )
          : (action as React.ReactNode)
        : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-forest-green/20 bg-card/60 p-16 text-center">
      <h3 className="font-display text-xl font-bold text-forest-green">{title}</h3>
      <p className="mt-2 max-w-md font-sans text-sm text-forest-green/70">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-6 rounded-full bg-forest-green/[0.06] px-5 py-2.5 font-display text-sm font-bold text-forest-green transition-colors hover:bg-forest-green/[0.1]"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
