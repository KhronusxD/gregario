import "server-only";
import type { AISettings } from "./settings";
import type { AgentContext } from "./context";

const TONE_GUIDANCE: Record<AISettings["tone"], string> = {
  formal: "Tom formal e reverente. Use 'senhor'/'senhora'. Evite gírias.",
  profissional: "Tom profissional, claro e direto. Educado sem ser distante.",
  acolhedor: "Tom acolhedor e próximo. Demonstre cuidado pastoral.",
  amigavel: "Tom descontraído e amigável, como um irmão em Cristo.",
  pastoral: "Tom pastoral, empático, com linguagem que honra a fé. Cite Escritura com discernimento, nunca forçado.",
};

const AUTONOMY_GUIDANCE: Record<AISettings["autonomy"], string> = {
  supervisionado: "Você é SUPERVISIONADO: sempre que houver dúvida, transfira para humano. Execute ações APENAS quando o membro pedir explicitamente.",
  semi_autonomo: "Você é SEMI-AUTÔNOMO: execute ações óbvias (inscrever em evento, atualizar cadastro, registrar pedido de oração). Transfira decisões pastorais, aconselhamento e qualquer tema delicado.",
  autonomo: "Você é AUTÔNOMO: tome iniciativa em ações do CRM (inscrever, atualizar, registrar oração, sugerir célula). Ainda assim, SEMPRE transfira temas pastorais sensíveis.",
};

const BASE_GUARDRAILS = [
  "NUNCA prometa bênçãos, milagres, curas ou respostas a orações.",
  "NUNCA faça aconselhamento pastoral profundo — transfira para um pastor humano.",
  "NUNCA cobre dízimos ou ofertas. Não registre promessas financeiras sem autorização humana explícita.",
  "NUNCA invente eventos, horários, endereços, nomes de pastores ou ministérios.",
  "NUNCA compartilhe dados de outros membros.",
  "Se não souber a resposta, transfira para humano — não especule.",
  "Mensagens devem ser CURTAS (máx 3 parágrafos). WhatsApp não é e-mail.",
  "Use negrito com *asteriscos* (sintaxe WhatsApp), não markdown.",
];

const ACTIONS_CATALOG = `
AÇÕES DISPONÍVEIS — retorne JSON no formato { "action": "...", "params": {...}, "reply": "texto para o membro" }:

1. transferir_pastor — pausa a IA e aciona um pastor humano
   params: { "motivo": "string curto descrevendo por que está transferindo" }

2. atualizar_membro — atualiza cadastro do membro (só campos permitidos)
   params: { "campo": "phone"|"email"|"address"|"neighborhood"|"city", "valor": "string" }

3. inscrever_evento — inscreve o membro em um evento próximo (precisa estar cadastrado)
   params: { "evento_id": "uuid-do-evento-da-lista" }

4. registrar_pedido_oracao — registra pedido de oração do membro no sistema
   params: { "conteudo": "descrição do pedido", "anonimo": true|false }

5. sugerir_celula — sugere uma célula próxima (não executa ação, só responde com a sugestão)
   params: { "celula_id": "uuid-da-celula-da-lista" }

6. registrar_visitante — cadastra um não-membro como visitante (use se pushName/nome for fornecido e não houver membro)
   params: { "nome": "nome completo", "neighborhood": "bairro opcional" }

Se nenhuma ação for apropriada, retorne APENAS texto puro (sem JSON) com a resposta.
`.trim();

const MEMBER_INSTRUCTIONS = `
COMPORTAMENTO OBRIGATÓRIO:
- SEMPRE cumprimente pelo primeiro nome na primeira mensagem do dia.
- Se o membro pedir para se inscrever em evento e estiver na lista — use inscrever_evento.
- Se o membro atualizar um dado de cadastro (endereço, email, telefone) — use atualizar_membro.
- Se o membro compartilhar um pedido de oração — use registrar_pedido_oracao.
- Se não houver membro cadastrado e ele fornecer o nome — use registrar_visitante.
- Se pedir ajuda pastoral, sofrimento emocional, luto, casamento em crise, dúvidas de fé profundas — use transferir_pastor IMEDIATAMENTE.
- Em caso de emergência (menção a suicídio, violência, abuso) — use transferir_pastor com motivo: "emergência" e priorize acolhimento na reply.
`.trim();

function listEvents(events: AgentContext["upcomingEvents"]): string {
  if (events.length === 0) return "(nenhum evento publicado)";
  return events
    .map((e) => {
      const date = new Date(e.date).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const vagas = e.max_spots != null ? ` (${e.spots_taken}/${e.max_spots} vagas)` : "";
      return `- ${e.title} — ${date}${e.location ? ` — ${e.location}` : ""}${vagas} [id: ${e.id}]`;
    })
    .join("\n");
}

function listGroups(groups: AgentContext["activeGroups"]): string {
  if (groups.length === 0) return "(nenhuma célula cadastrada)";
  return groups
    .map((g) => {
      const parts = [g.name];
      if (g.neighborhood) parts.push(g.neighborhood);
      if (g.day_of_week && g.time) parts.push(`${g.day_of_week} ${g.time}`);
      if (g.leader_name) parts.push(`líder: ${g.leader_name}`);
      return `- ${parts.join(" — ")} [id: ${g.id}]`;
    })
    .join("\n");
}

function listFaqs(faqs: AgentContext["faqs"]): string {
  if (faqs.length === 0) return "(sem FAQ)";
  return faqs.slice(0, 20).map((f) => `P: ${f.question}\nR: ${f.answer}`).join("\n\n");
}

export function buildSystemPrompt(settings: AISettings, ctx: AgentContext): string {
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const memberLine = ctx.member
    ? `MEMBRO: ${ctx.member.name} (${ctx.member.phone ?? "?"}) — status: ${ctx.member.status ?? "ativo"}${ctx.member.neighborhood ? ` — bairro: ${ctx.member.neighborhood}` : ""}${ctx.member.email ? ` — ${ctx.member.email}` : ""}`
    : "MEMBRO: (não cadastrado — possível visitante)";

  const parts: string[] = [];

  parts.push(`Você é ${settings.assistant_name ?? "a secretaria virtual"} da ${ctx.workspace.name}.`);
  if (settings.show_assistant_name && settings.assistant_name) {
    parts.push(`Pode se apresentar como "${settings.assistant_name}".`);
  }
  parts.push(TONE_GUIDANCE[settings.tone]);
  parts.push(AUTONOMY_GUIDANCE[settings.autonomy]);

  if (settings.system_prompt) {
    parts.push(`CONTEXTO DA IGREJA:\n${settings.system_prompt}`);
  }

  parts.push(`Data/hora agora: ${now}`);
  parts.push(memberLine);

  if (ctx.workspace.address) parts.push(`Endereço: ${ctx.workspace.address}`);
  if (ctx.workspace.service_schedule) parts.push(`Horário de cultos: ${ctx.workspace.service_schedule}`);
  if (ctx.workspace.welcome_message) parts.push(`Mensagem de boas-vindas: ${ctx.workspace.welcome_message}`);

  parts.push(`PRÓXIMOS EVENTOS:\n${listEvents(ctx.upcomingEvents)}`);
  parts.push(`CÉLULAS:\n${listGroups(ctx.activeGroups)}`);
  parts.push(`FAQ DA IGREJA:\n${listFaqs(ctx.faqs)}`);

  if (ctx.knowledgeBase) {
    parts.push(`BASE DE CONHECIMENTO (materiais da igreja):\n${ctx.knowledgeBase}`);
  }

  parts.push(`DIRETRIZES INEGOCIÁVEIS:\n${BASE_GUARDRAILS.map((r) => `- ${r}`).join("\n")}`);
  if (settings.negative_rules.length > 0) {
    parts.push(`REGRAS ADICIONAIS DESTA IGREJA:\n${settings.negative_rules.map((r) => `- ${r}`).join("\n")}`);
  }

  parts.push(MEMBER_INSTRUCTIONS);
  parts.push(ACTIONS_CATALOG);

  return parts.join("\n\n");
}

export function buildMessageHistory(ctx: AgentContext): Array<{ role: "user" | "assistant"; content: string }> {
  return ctx.recentMessages
    .filter((m) => m.body || m.transcription || m.ai_analysis)
    .map((m) => {
      let content = m.body ?? "";
      if (m.transcription) content = `[ÁUDIO TRANSCRITO]: "${m.transcription}"`;
      if (m.type === "image" && m.ai_analysis) content = `[IMAGEM]: ${m.ai_analysis}${m.body ? `\nLegenda: ${m.body}` : ""}`;
      return { role: m.from_me ? "assistant" : "user", content };
    });
}
