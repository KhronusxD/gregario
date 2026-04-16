import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithHumanDelay } from "@/lib/whatsapp/send";
import { transferToHuman } from "@/lib/ai/transfer";

type EventRow = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  max_spots: number | null;
  spots_taken: number;
};

export async function handleRegistration(params: {
  workspaceId: string;
  conversationId: string;
  phone: string;
  eventName?: string;
}) {
  const supabase = createAdminClient();

  if (!params.eventName) {
    await transferToHuman({
      conversationId: params.conversationId,
      workspaceId: params.workspaceId,
      phone: params.phone,
      reason: "Inscrição solicitada sem nome do evento",
    });
    return;
  }

  const { data: events } = await supabase
    .from("events")
    .select("id, title, date, location, max_spots, spots_taken")
    .eq("workspace_id", params.workspaceId)
    .eq("status", "published")
    .gte("date", new Date().toISOString())
    .ilike("title", `%${params.eventName}%`)
    .limit(1);

  const event = (events as EventRow[] | null)?.[0] ?? null;

  if (!event) {
    await sendWithHumanDelay({
      workspaceId: params.workspaceId,
      conversationId: params.conversationId,
      phone: params.phone,
      text: "Não encontrei esse evento no calendário. Vou verificar com a equipe e te retorno em breve!",
    });
    await transferToHuman({
      conversationId: params.conversationId,
      workspaceId: params.workspaceId,
      phone: params.phone,
      reason: `Evento "${params.eventName}" não encontrado`,
    });
    return;
  }

  if (event.max_spots != null && event.spots_taken >= event.max_spots) {
    await sendWithHumanDelay({
      workspaceId: params.workspaceId,
      conversationId: params.conversationId,
      phone: params.phone,
      text: `Infelizmente as vagas para *${event.title}* já estão esgotadas. Quer entrar na lista de espera?`,
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
    await sendWithHumanDelay({
      workspaceId: params.workspaceId,
      conversationId: params.conversationId,
      phone: params.phone,
      text: `Para se inscrever em *${event.title}*, preciso do seu nome completo. Pode me informar?`,
    });
    return;
  }

  const { error } = await supabase
    .from("event_registrations")
    .insert({
      workspace_id: params.workspaceId,
      event_id: event.id,
      member_id: member.id,
      status: "confirmed",
    } as never);

  if (error) {
    await transferToHuman({
      conversationId: params.conversationId,
      workspaceId: params.workspaceId,
      phone: params.phone,
      reason: `Falha ao registrar inscrição: ${error.message}`,
    });
    return;
  }

  await supabase
    .from("events")
    .update({ spots_taken: event.spots_taken + 1 } as never)
    .eq("id", event.id);

  const firstName = member.name.split(" ")[0];
  const dateStr = new Date(event.date).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  await sendWithHumanDelay({
    workspaceId: params.workspaceId,
    conversationId: params.conversationId,
    phone: params.phone,
    text: `✅ Inscrição confirmada!\n\n*${event.title}*\n📅 ${dateStr}\n📍 ${event.location ?? "a confirmar"}\n\nAté lá, ${firstName}! 🎉`,
  });
}
