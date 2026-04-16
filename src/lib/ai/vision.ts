import "server-only";
import { getAnthropic, HAIKU_MODEL } from "./anthropic";

const VISION_PROMPT = `Descreva brevemente o conteúdo desta imagem em português.
Se for um documento (comprovante, ficha, formulário), extraia os dados principais.
Se for uma foto de pessoa/grupo/ambiente, descreva em uma frase.
Se for screenshot de outra conversa, transcreva o essencial.
Máximo 300 caracteres. Seja objetivo.`;

export async function analyzeImage(params: {
  url: string;
  caption?: string;
}): Promise<{ text: string | null; error?: string }> {
  try {
    const res = await fetch(params.url);
    if (!res.ok) return { text: null, error: `download falhou: ${res.status}` };
    const buf = await res.arrayBuffer();
    const mime = res.headers.get("content-type") || "image/jpeg";
    if (!mime.startsWith("image/")) return { text: null, error: `mime inválido: ${mime}` };
    const base64 = Buffer.from(buf).toString("base64");

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mime as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 },
            },
            {
              type: "text",
              text: params.caption ? `${VISION_PROMPT}\n\nLegenda enviada pelo membro: "${params.caption}"` : VISION_PROMPT,
            },
          ],
        },
      ],
    });

    const block = response.content[0];
    const text = block?.type === "text" ? block.text.trim() : "";
    return { text: text || null };
  } catch (err) {
    return { text: null, error: err instanceof Error ? err.message : String(err) };
  }
}
