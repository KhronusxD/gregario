import "server-only";
import { normalizePhone } from "./normalize";

const META_URL = "https://graph.facebook.com/v22.0";

export async function sendMetaText(params: {
  phoneNumberId: string;
  token: string;
  to: string;
  text: string;
}) {
  const res = await fetch(`${META_URL}/${params.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(params.to),
      type: "text",
      text: { body: params.text },
    }),
  });
  if (!res.ok) {
    throw new Error(`Meta sendText failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function setMetaTyping(params: {
  phoneNumberId: string;
  token: string;
  messageId: string;
}) {
  await fetch(`${META_URL}/${params.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: params.messageId,
      typing_indicator: { type: "text" },
    }),
  }).catch(() => {});
}

export type NormalizedInboundMessage = {
  provider: "meta";
  phoneNumberId: string;
  from: string;
  messageId: string;
  body: string;
  type: "text" | "image" | "audio" | "document" | "other";
  timestamp: number;
};

export function extractMetaMessage(payload: unknown): (NormalizedInboundMessage & { mediaId?: string; mimeType?: string; caption?: string }) | null {
  const p = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string };
          messages?: Array<{
            id: string;
            from: string;
            type: string;
            timestamp: string;
            text?: { body?: string };
            image?: { id: string; mime_type?: string; caption?: string };
            audio?: { id: string; mime_type?: string };
          }>;
        };
      }>;
    }>;
  };

  const value = p.entry?.[0]?.changes?.[0]?.value;
  const msg = value?.messages?.[0];
  const phoneNumberId = value?.metadata?.phone_number_id;
  if (!msg || !phoneNumberId) return null;

  const typeMap: Record<string, NormalizedInboundMessage["type"]> = {
    text: "text",
    image: "image",
    audio: "audio",
    document: "document",
  };

  const type = typeMap[msg.type] ?? "other";
  const mediaId = type === "image" ? msg.image?.id : type === "audio" ? msg.audio?.id : undefined;
  const mimeType = type === "image" ? msg.image?.mime_type : type === "audio" ? msg.audio?.mime_type : undefined;
  const caption = msg.image?.caption;

  return {
    provider: "meta",
    phoneNumberId,
    from: msg.from,
    messageId: msg.id,
    body: msg.text?.body ?? caption ?? "",
    type,
    timestamp: Number(msg.timestamp) * 1000,
    mediaId,
    mimeType,
    caption,
  };
}
