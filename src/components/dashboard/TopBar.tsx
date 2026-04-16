import { Search, Bell, Clock } from "lucide-react";
import { requireWorkspace } from "@/lib/auth/dal";
import { signOutAction } from "@/actions/auth";

function initialsFrom(name?: string | null) {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export async function TopBar() {
  const ctx = await requireWorkspace();
  const displayName =
    (ctx.user.user_metadata?.pastor_name as string | undefined) ??
    ctx.user.email ??
    "Admin";

  return (
    <header className="sticky top-0 z-40 ml-64 flex h-20 items-center justify-between bg-surface/80 px-10 backdrop-blur-xl">
      <div className="flex max-w-xl flex-1 items-center">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-green/40" />
          <input
            type="text"
            placeholder="Buscar membros, eventos ou recursos..."
            className="w-full rounded-full bg-forest-green/[0.04] py-2.5 pl-12 pr-4 font-sans text-sm text-forest-green placeholder:text-forest-green/40 focus:outline-none focus:ring-2 focus:ring-forest-green/20"
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button className="relative rounded-full p-2 text-forest-green/50 transition-colors hover:bg-forest-green/[0.06]">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-surface bg-red-500" />
          </button>
          <button className="rounded-full p-2 text-forest-green/50 transition-colors hover:bg-forest-green/[0.06]">
            <Clock className="h-5 w-5" />
          </button>
        </div>
        <div className="h-8 w-px bg-forest-green/10" />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-display text-sm font-bold tracking-tight text-forest-green">
              {displayName}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-forest-green/50">
              {ctx.workspace.name}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-action-green to-forest-green font-display text-sm font-bold text-card ring-2 ring-forest-green/10">
            {initialsFrom(displayName)}
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-full border border-forest-green/10 px-3 py-1.5 font-sans text-xs font-bold text-forest-green/70 transition-colors hover:bg-forest-green/[0.06]"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
