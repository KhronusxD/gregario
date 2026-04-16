import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-8 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-forest-green">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-card">
              <path d="M12 3L4 9v12h16V9l-8-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 3v18M9 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-display text-lg font-extrabold text-forest-green">Gregário</span>
        </Link>
      </header>
      <main className="flex min-h-screen items-center justify-center px-4 py-20">
        {children}
      </main>
    </div>
  );
}
