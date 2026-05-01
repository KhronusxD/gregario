import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { pauseAI } from "./transfer";
import { notifyHandoff } from "./notify";
import type { AgentContext } from "./context";

export type AgentAction =
  | { action: "transferir_pastor"; params: { motivo: string }; reply?: string }
  | { action: "atualizar_membro"; params: { campo: string; valor: string }; reply?: string }
  | { action: "inscrever_evento"; params: { evento_id: string }; reply?: string }
  | { action: "registrar_pedido_oracao"; params: { conteudo: string; anonimo?: boolean }; reply?: string }
  | { action: "sugerir_celula"; params: { celula_id: string }; reply?: string }
  | { action: "registrar_visitante"; params: { nome: string; neighborhood?: string }; reply?: string };

const ALLOWED_MEMBER_FIELDS = ["phone", "email", "address", "neighborhood", "city", "birthday"] as const;

export type ActionResult = { ok: boolean; reply: string | null; log?: string };

export async function executeAction(
  action: AgentAction,
  ctx: {
    workspaceId: string;
    conversationId: string;
    phone: string;
    agentCtx: AgentContext;
  },
): Promise<ActionResult> {
  const supabase = createAdminClient();

  switch (action.action) {
    case "transferir_pastor": {
      await pauseAI({
        conversationId: ctx.conversationId,
        workspaceId: ctx.workspaceId,
        reason: action.params.motivo,
      });
      await notifyHandoff({
        workspaceId: ctx.workspaceId,
        conversationId: ctx.conversationId,
        reason: action.params.motivo,
      });
      return {
        ok: true,
        reply: action.reply ?? "Vou chamar um pastor para continuar essa conversa. Um momento, por favor. 🙏",
        log: `transferir_pastor: ${action.params.motivo}`,
      };
    }

    case "atualizar_membro": {
      if (!ctx.agentCtx.member) {
        return { ok: false, reply: "Preciso do seu cadastro antes. Pode me enviar seu nome completo?" };
      }
      const field = action.params.campo;
      if (!ALLOWED_MEMBER_FIELDS.includes(field as (typeof ALLOWED_MEMBER_FIELDS)[number])) {
        return { ok: false, reply: "Esse dado precisa ser atualizado pela secretaria. Vou pedir para te chamarem." };
      }
      const value = (action.params.valor ?? "").trim();
      if (!value) return { ok: false, reply: "Não identifiquei o novo valor. Pode me mandar de novo?" };
      await supabase
        .from("members")
        .update({ [field]: value } as never)
        .eq("id", ctx.agentCtx.member.id);
      return {
        ok: true,
        reply: action.reply ?? `Atualizado! Seu novo ${field} foi salvo. ✅`,
        log: `atualizar_membro: ${field}=${value}`,
      };
    }

    case "inscrever_evento": {
      if (!ctx.agentCtx.member) {
        return { ok: false, reply: "Para me inscrever, preciso do seu cadastro. Qual seu nome completo?" };
      }
      const event = ctx.agentCtx.upcomingEvents.find((e) => e.id === action.params.evento_id);
      if (!event) {
        return { ok: false, reply: "Não encontrei esse evento no calendário. Pode confirmar o nome?" };
      }
      if (event.max_spots != null && event.spots_taken >= event.max_spots) {
        return { ok: true, reply: `As vagas para *${event.title}* estão esgotadas. Quer entrar na lista de espera?` };
      }
      const { error } = await supabase
        .from("event_registrations")
        .insert({
          workspace_id: ctx.workspaceId,
          event_id: event.id,
          member_id: ctx.agentCtx.member.id,
          status: "confirmed",
        } as never);
      if (error) {
        return { ok: false, reply: "Tive um problema técnico pra registrar. Vou pedir para a secretaria te chamar.", log: error.message };
      }
      await supabase
        .from("events")
        .update({ spots_taken: event.spots_taken + 1 } as never)
        .eq("id", event.id);
      const date = new Date(event.date).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        ok: true,
        reply: action.reply ?? `✅ Inscrição confirmada!\n\n*${event.title}*\n📅 ${date}\n📍 ${event.location ?? "a confirmar"}`,
        log: `inscrever_evento: ${event.title}`,
      };
    }

    case "registrar_pedido_oracao": {
      if (!ctx.agentCtx.member) {
        return { ok: false, reply: "Posso orar com você agora. Para registrar oficialmente o pedido na igreja, preciso do seu nome." };
      }
      const { error } = await supabase
        .from("prayer_requests")
        .insert({
          workspace_id: ctx.workspaceId,
          member_id: ctx.agentCtx.member.id,
          body: action.params.conteudo,
          is_anonymous: action.params.anonimo ?? false,
          status: "open",
          visibility: "public",
        } as never);
      if (error) {
        return { ok: false, reply: "Não consegui registrar agora, mas já estou orando por você. Um pastor vai te procurar.", log: error.message };
      }
      return {
        ok: true,
        reply: action.reply ?? "Seu pedido foi registrado e nossa equipe pastoral vai orar por você. 🙏",
        log: "registrar_pedido_oracao",
      };
    }

    case "sugerir_celula": {
      const cell = ctx.agentCtx.activeGroups.find((g) => g.id === action.params.celula_id);
      if (!cell) {
        return { ok: false, reply: "Deixa eu confirmar com a secretaria qual célula é mais próxima de você." };
      }
      const parts = [cell.name];
      if (cell.neighborhood) parts.push(`no ${cell.neighborhood}`);
      if (cell.day_of_week && cell.time) parts.push(`toda ${cell.day_of_week} às ${cell.time}`);
      if (cell.leader_name) parts.push(`com ${cell.leader_name}`);
      return {
        ok: true,
        reply: action.reply ?? `Tenho uma célula ótima pra te indicar: *${parts.join(", ")}*. Quer que eu avise o líder que você tem interesse?`,
        log: `sugerir_celula: ${cell.name}`,
      };
    }

    case "registrar_visitante": {
      const name = (action.params.nome ?? "").trim();
      if (!name) return { ok: false, reply: "Não captei seu nome. Pode me enviar o nome completo?" };
      const { error } = await supabase
        .from("members")
        .insert({
          workspace_id: ctx.workspaceId,
          name,
          phone: ctx.phone,
          neighborhood: action.params.neighborhood ?? null,
          status: "visitante",
        } as never);
      if (error) {
        return { ok: false, reply: "Tive um problema pra registrar seu cadastro. Vou pedir pra secretaria te chamar.", log: error.message };
      }
      return {
        ok: true,
        reply: action.reply ?? `Muito prazer, ${name.split(" ")[0]}! Já salvei seu contato. 🤝 Como posso te ajudar?`,
        log: `registrar_visitante: ${name}`,
      };
    }

    default:
      return { ok: false, reply: null };
  }
}

export function extractAction(text: string): { action: AgentAction | null; remainder: string } {
  if (!text) return { action: null, remainder: "" };

  const strategies = [
    () => {
      const trimmed = text.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        return JSON.parse(trimmed);
      }
      return null;
    },
    () => {
      const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (match?.[1]) return JSON.parse(match[1]);
      return null;
    },
    () => {
      const match = text.match(/(\{[\s\S]*"action"[\s\S]*\})/);
      if (match?.[1]) return JSON.parse(match[1]);
      return null;
    },
  ];

  for (const strat of strategies) {
    try {
      const parsed = strat();
      if (parsed && typeof parsed === "object" && "action" in parsed) {
        const reply = typeof parsed.reply === "string" ? parsed.reply : "";
        return { action: parsed as AgentAction, remainder: reply };
      }
    } catch {
      // try next
    }
  }

  return { action: null, remainder: text };
}
