"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/ai/config", label: "Configuração" },
  { href: "/dashboard/ai/knowledge", label: "Base de conhecimento" },
  { href: "/dashboard/ai/flows", label: "Fluxos" },
];

export function AITabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 border-b border-forest-green/10">
      {TABS.map((t) => {
        const active = pathname?.startsWith(t.href) ?? false;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`border-b-2 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-widest transition-all ${
              active
                ? "border-forest-green text-forest-green"
                : "border-transparent text-forest-green/50 hover:text-forest-green"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
