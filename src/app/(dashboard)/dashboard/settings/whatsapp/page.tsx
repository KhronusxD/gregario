import { requireWorkspace } from "@/lib/auth/dal";
import { WhatsappChannelCard } from "@/components/settings/WhatsappChannelCard";
import { SyncContactsCard } from "@/components/settings/SyncContactsCard";

export default async function WhatsappSettingsPage() {
  const ctx = await requireWorkspace();
  const ws = ctx.workspace as typeof ctx.workspace & {
    evolution_instance?: string | null;
    meta_phone_number_id?: string | null;
  };
  return (
    <>
      <WhatsappChannelCard
        hasInstance={!!ws.evolution_instance}
        instanceName={ws.evolution_instance ?? null}
        metaPhoneNumberId={ws.meta_phone_number_id ?? null}
      />
      {ws.evolution_instance && <SyncContactsCard />}
    </>
  );
}
