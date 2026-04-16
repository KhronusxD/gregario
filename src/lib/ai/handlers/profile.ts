import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithHumanDelay } from "@/lib/whatsapp/send";
import { transferToHuman } from "@/lib/ai/transfer";

const ALLOWED_FIELDS = ["phone", "email", "address", "neighborhood", "city"] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

const FIELD_LABEL: Record<AllowedField, string> = {
  phone: "telefone",
  email: "e-mail",
  address: "endereço",
  neighborhood: "bairro",
  city: "cidade",
};

export async function handleProfileUpdate(params: {
  workspaceId: string;
  conversationId: string;
  phone: string;
  field?: string;
  value?: string;
}) {
  const supabase = createAdminClient();

  if (!params.field || !params.value) {
    await transferToHuman({
      conversationId: params.conversationId,
      workspaceId: params.workspaceId,
      phone: params.phone,
      reason: "Atualização de cadastro sem campo/valor identificado",
    });
    return;
  }

  const field = params.field as AllowedField;
  if (!ALLOWED_FIELDS.includes(field)) {
    await transferToHuman({
      conversationId: params.conversationId,
      workspaceId: params.workspaceId,
      phone: params.phone,
      reason: `Campo "${params.field}" requer atualização manual`,
    });
    return;
  }

  const { data: members } = await supabase
    .from("members")
    .select("id, name")
    .eq("workspace_id", params.workspaceId)
    .eq("phone", params.phone)
    .limit(1);

  const member = (members as Array<{ id: string; name: string }> | null)?.[0] ?? null;
  if (!member) {
    await transferToHuman({
      conversationId: params.conversationId,
      workspaceId: params.workspaceId,
      phone: params.phone,
      reason: "Não cadastrado tentou atualizar dados",
    });
    return;
  }

  await supabase
    .from("members")
    .update({ [field]: params.value } as never)
    .eq("id", member.id);

  await sendWithHumanDelay({
    workspaceId: params.workspaceId,
    conversationId: params.conversationId,
    phone: params.phone,
    text: `Prontinho, ${member.name.split(" ")[0]}! Seu ${FIELD_LABEL[field]} foi atualizado para *${params.value}*. 🙌`,
  });
}
