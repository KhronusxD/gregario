import Link from "next/link";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between border-b border-forest-green/5 px-10 py-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-forest-green">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-card">
              <path d="M12 3L4 9v12h16V9l-8-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 3v18M9 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-display text-lg font-extrabold text-forest-green">Gregário</span>
        </Link>
        <Link
          href="/dashboard"
          className="font-sans text-xs font-bold text-forest-green/60 hover:text-forest-green"
        >
          Pular por ora
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
    </div>
  );
}

