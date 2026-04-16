"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: React.ReactNode };

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/${slug}/app`;

  const tabs: Tab[] = [
    { href: base, label: "Início", icon: <Icon d="M3 10l9-7 9 7v11H3V10z M9 21v-6h6v6" /> },
    { href: `${base}/prayer`, label: "Oração", icon: <Icon d="M12 2v20 M5 8l14 8 M19 8L5 16" /> },
    { href: `${base}/events`, label: "Agenda", icon: <Icon d="M7 3v4 M17 3v4 M3 9h18 M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { href: `${base}/me`, label: "Eu", icon: <Icon d="M12 12a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-forest-green/10 bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md justify-around px-2 py-2">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== base && pathname.startsWith(t.href));
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 font-sans text-[10px] font-bold ${
                  active ? "text-forest-green" : "text-forest-green/40"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
