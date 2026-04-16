import { AITabs } from "@/components/ai/AITabs";

export default function AILayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="ml-64 max-w-[1400px] p-10">
      <div className="mb-8">
        <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.25em] text-forest-green/50">
          Inteligência
        </p>
        <h1 className="mb-6 font-display text-3xl font-extrabold text-forest-green">IA Agêntica</h1>
        <AITabs />
      </div>
      {children}
    </main>
  );
}
