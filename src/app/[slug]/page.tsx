import Link from "next/link";
import { getWorkspaceBySlug } from "@/lib/workspace";

export default async function MemberWelcomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = (await getWorkspaceBySlug(slug))!;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-12">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-forest-green text-card">
          <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
            <path d="M12 3L4 9v12h16V9l-8-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 3v18M9 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <p className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
          Bem-vindo à
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-forest-green">
          {workspace.name}
        </h1>
        {workspace.welcome_message ? (
          <p className="mt-4 font-sans text-sm text-forest-green/70">
            {workspace.welcome_message}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <Link
          href={`/${slug}/login`}
          className="flex items-center justify-center rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-4 font-display text-sm font-bold text-card active:scale-95"
        >
          Entrar com WhatsApp
        </Link>
        <Link
          href={`/${slug}/app`}
          className="block text-center font-sans text-xs font-bold text-forest-green/60 hover:text-forest-green"
        >
          Já fiz login antes
        </Link>
      </div>
    </main>
  );
}
