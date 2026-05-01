import "server-only";
import { getAnthropic, HAIKU_MODEL } from "./anthropic";
import { loadAISettings } from "./settings";
import { loadAgentContext } from "./context";
import { buildSystemPrompt, buildMessageHistory } from "./prompt";
import { executeAction, extractAction } from "./actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { pauseAI } from "./transfer";
import { notifyHandoff } from "./notify";

const MAX_TOKENS = 512;

export async function runAgent(params: {
  workspaceId: string;
  conversationId: string;
  phone: string;
  message: string;
}): Promise<string | null> {
  const settings = await loadAISettings(params.workspaceId);
  const ctx = await loadAgentContext({
    workspaceId: params.workspaceId,
    conversationId: params.conversationId,
    phone: params.phone,
  });

  // Limite de mensagens por conversa
  if (settings.max_messages_per_conversation > 0 && ctx.iaMessageCount >= settings.max_messages_per_conversation) {
    const reason = "limite de mensagens IA atingido";
    await pauseAI({
      conversationId: params.conversationId,
      workspaceId: params.workspaceId,
      reason,
    });
    await notifyHandoff({
      workspaceId: params.workspaceId,
      conversationId: params.conversationId,
      reason,
    });
    return "Vou passar essa conversa para um pastor humano continuar com você. Um momento. 🙏";
  }

  const systemPrompt = buildSystemPrompt(settings, ctx);
  const history = buildMessageHistory(ctx);

  // Garante que a última mensagem é o prompt atual (caso o debounce tenha combinado)
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    history.push({ role: "user", content: params.message });
  }

  let rawText: string;
  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: history,
    });
    const block = response.content[0];
    rawText = block.type === "text" ? block.text.trim() : "";
  } catch (err) {
    console.error("[agent] anthropic error:", err);
    return null;
  }

  if (!rawText) return null;

  const { action, remainder } = extractAction(rawText);

  if (action) {
    const result = await executeAction(action, {
      workspaceId: params.workspaceId,
      conversationId: params.conversationId,
      phone: params.phone,
      agentCtx: ctx,
    });
    if (result.log) {
      await createAdminClient()
        .from("ai_usage_logs")
        .insert({
          workspace_id: params.workspaceId,
          action: action.action,
          conversation_id: params.conversationId,
          metadata: { log: result.log, params: action.params },
        } as never);
    }
    // Prefere a reply do action (pode ser o resultado real), cai pra remainder, cai pra o reply do próprio JSON
    return result.reply ?? remainder ?? null;
  }

  return remainder || rawText;
}
