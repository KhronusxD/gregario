import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithHumanDelay } from "@/lib/whatsapp/send";
import { transferToHuman } from "@/lib/ai/transfer";
import { getAnthropic, HAIKU_MODEL } from "@/lib/ai/anthropic";

export async function handleFAQ(params: {
  workspaceId: string;
  conversationId: string;
  phone: string;
  question: string;
}) {
  const supabase = createAdminClient();

  const [workspaceRes, faqRes] = await Promise.all([
    supabase
      .from("workspaces")
      .select("name, address, welcome_message, service_schedule")
      .eq("id", params.workspaceId)
      .maybeSingle(),
    supabase
      .from("whatsapp_faq")
      .select("question, answer")
      .eq("workspace_id", params.workspaceId)
      .eq("active", true),
  ]);

  const workspace = workspaceRes.data as {
    name?: string;
    address?: string;
    service_schedule?: string;
  } | null;
  const faqs = (faqRes.data ?? []) as Array<{ question: string; answer: string }>;

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 500,
    system: `Você é a secretaria virtual da ${workspace?.name ?? "igreja"}.
Responda de forma natural, acolhedora e concisa — como uma secretaria humana faria.
Não invente informações. Se não souber a resposta com base no FAQ, diga que vai verificar com a equipe.

INFORMAÇÕES DA IGREJA:
${faqs.map((f) => `P: ${f.question}\nR: ${f.answer}`).join("\n\n") || "(nenhum FAQ cadastrado)"}

Horário de cultos: ${workspace?.service_schedule ?? "consultar a secretaria"}
Endereço: ${workspace?.address ?? "consultar a secretaria"}`,
    messages: [{ role: "user", content: params.question }],
  });

  const block = response.content[0];
  const text = block.type === "text" ? block.text.trim() : "";

  const lower = text.toLowerCase();
  if (!text || lower.includes("verificar com a equipe") || lower.includes("transferir")) {
    await transferToHuman({
      conversationId: params.conversationId,
      workspaceId: params.workspaceId,
      phone: params.phone,
      reason: "Dúvida não coberta pelo FAQ",
    });
    return;
  }

  await sendWithHumanDelay({
    workspaceId: params.workspaceId,
    conversationId: params.conversationId,
    phone: params.phone,
    text,
  });
}
