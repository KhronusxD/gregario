import { SettingsTabs } from "@/components/settings/SettingsTabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="ml-64 max-w-5xl p-10">
      <div className="mb-8">
        <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.25em] text-forest-green/50">
          Administração
        </p>
        <h1 className="mb-6 font-display text-3xl font-extrabold text-forest-green">Configurações</h1>
        <SettingsTabs />
      </div>
      {children}
    </main>
  );
}
