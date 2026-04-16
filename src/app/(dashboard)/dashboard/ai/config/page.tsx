import { requireWorkspace } from "@/lib/auth/dal";
import { loadAISettings } from "@/lib/ai/settings";
import { AIMasterToggle } from "@/components/ai/AIMasterToggle";
import { AIConfigForm } from "@/components/ai/AIConfigForm";

export default async function AIConfigPage() {
  const ctx = await requireWorkspace();
  const settings = await loadAISettings(ctx.workspace.id);
  const active = Boolean(ctx.workspace.ia_active);

  return (
    <div className="space-y-6">
      <AIMasterToggle active={active} />
      <AIConfigForm settings={settings} />
    </div>
  );
}
