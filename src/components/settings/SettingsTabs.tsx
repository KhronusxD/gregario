"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/settings", label: "Geral", exact: true },
  { href: "/dashboard/settings/whatsapp", label: "WhatsApp" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 border-b border-forest-green/10">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname?.startsWith(t.href) ?? false;
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
