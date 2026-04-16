"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  LayoutDashboard,
  Users,
  Wallet,
  HeartHandshake,
  Calendar,
  Folder,
  MessageCircle,
  Bot,
  Sparkles,
  Flame,
  Settings,
  LifeBuoy,
  CreditCard,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Membros", icon: Users },
  { href: "/dashboard/treasury", label: "Tesouraria", icon: Wallet },
  { href: "/dashboard/groups", label: "Grupos", icon: HeartHandshake },
  { href: "/dashboard/events", label: "Eventos", icon: Calendar },
  { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/dashboard/ai", label: "IA Agêntica", icon: Bot },
  { href: "/dashboard/pastoral", label: "Pastoreio", icon: Sparkles },
  { href: "/dashboard/prayer", label: "Oração", icon: Flame },
  { href: "/dashboard/content", label: "Conteúdo", icon: Folder },
];

const footerNav: NavItem[] = [
  { href: "/dashboard/billing", label: "Assinatura", icon: CreditCard },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
  { href: "/dashboard/support", label: "Suporte", icon: LifeBuoy },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-forest-green/[0.04] px-4 py-8">
      <div className="mb-10 flex items-center gap-3 px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-forest-green">
          <LogoMark className="h-5 w-5 text-card" />
        </div>
        <div>
          <h1 className="font-display text-xl font-extrabold leading-none text-forest-green">
            Gregário
          </h1>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-forest-green/50">
            Stewardship Suite
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {mainNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>

      <div className="mt-6 space-y-1 pt-6">
        <button className="mb-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-forest-green to-action-green px-4 py-3 font-display text-sm font-bold text-card transition-transform active:scale-95">
          <Plus className="h-4 w-4" />
          Ação Rápida
        </button>
        {footerNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
          />
        ))}
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 py-2.5 pl-4 text-sm transition-all",
        active
          ? "border-r-4 border-forest-green font-display font-bold text-forest-green"
          : "font-semibold text-forest-green/50 hover:bg-forest-green/[0.06] hover:text-forest-green"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="tracking-tight">{item.label}</span>
    </Link>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3L4 9v12h16V9l-8-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3v18M9 14h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
