import { requireWorkspace } from "@/lib/auth/dal";
import { loadAISettings } from "@/lib/ai/settings";
import { NotificationsCard } from "@/components/settings/NotificationsCard";

export default async function NotificationsSettingsPage() {
  const ctx = await requireWorkspace();
  const settings = await loadAISettings(ctx.workspace.id);

  return (
    <NotificationsCard
      initialActive={settings.notify_active}
      initialPhone={settings.notify_phone}
    />
  );
}
