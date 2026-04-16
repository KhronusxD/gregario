import "server-only";
import { getAnthropic, HAIKU_MODEL } from "./anthropic";

export type Intent = "faq" | "inscricao" | "cadastro" | "pastoral" | "desconhecido";

export type Classification = {
  intent: Intent;
  confidence: number;
  entities: {
    event_name?: string;
    field_to_update?: string;
    new_value?: string;
  };
  reason?: string;
};

type ClassifyMessage = { from_me: boolean; body: string };

export async function classifyIntent(params: {
  workspaceName: string;
  messages: ClassifyMessage[];
}): Promise<Classification> {
  const transcript = params.messages
    .map((m) => `${m.from_me ? "Secretaria" : "Membro"}: ${m.body}`)
    .join("\n");

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 300,
    system: `Você é um classificador de intenções para a secretaria da ${params.workspaceName}.
Analise as mensagens e retorne APENAS JSON válido no formato:
{
  "intent": "faq|inscricao|cadastro|pastoral|desconhecido",
  "confidence": 0.0-1.0,
  "entities": {
    "event_name": "nome do evento se mencionado",
    "field_to_update": "phone|email|address|neighborhood|city se for cadastro",
    "new_value": "novo valor se cadastro"
  },
  "reason": "breve justificativa"
}

Intents:
- faq: dúvida geral (horário, endereço, pastor, como se tornar membro, dízimo)
- inscricao: pedido para se inscrever em evento/seminário
- cadastro: quer atualizar dados pessoais
- pastoral: desabafo, pedido de oração direto ao pastor, crise
- desconhecido: não se encaixa nos anteriores`,
    messages: [{ role: "user", content: transcript }],
  });

  const block = response.content[0];
  const text = block.type === "text" ? block.text : "";

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("sem JSON");
    const parsed = JSON.parse(match[0]) as Classification;
    return {
      intent: parsed.intent ?? "desconhecido",
      confidence: parsed.confidence ?? 0,
      entities: parsed.entities ?? {},
      reason: parsed.reason,
    };
  } catch {
    return { intent: "desconhecido", confidence: 0, entities: {} };
  }
}
