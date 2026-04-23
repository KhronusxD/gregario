import "server-only";

const BASE = process.env.EVOLUTION_API_URL;
const KEY = process.env.EVOLUTION_API_KEY;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export async function sendWhatsAppText({
  instanceName,
  phone,
  text,
}: {
  instanceName: string;
  phone: string;
  text: string;
}) {
  if (!BASE || !KEY) {
    throw new Error("EVOLUTION_API_URL / EVOLUTION_API_KEY not configured");
  }
  const res = await fetch(`${BASE}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: KEY,
    },
    body: JSON.stringify({
      number: normalizePhone(phone),
      textMessage: { text },
    }),
  });
  if (!res.ok) {
    throw new Error(`Evolution sendText failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type EvolutionQr = {
  base64?: string;
  code?: string;
  pairingCode?: string;
};

export type CreateInstanceResponse = {
  instance?: { instanceName?: string; status?: string };
  hash?: { apikey?: string } | string;
  qrcode?: EvolutionQr;
};

// Eventos Evolution v2 que o backend do Gregário consome
export const DEFAULT_WEBHOOK_EVENTS = [
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "CONNECTION_UPDATE",
  "QRCODE_UPDATED",
  "SEND_MESSAGE",
] as const;

function webhookUrl(): string | null {
  const origin = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) return null;
  return `${origin.replace(/\/$/, "")}/api/webhooks/evolution`;
}

export async function createEvolutionInstance(instanceName: string): Promise<CreateInstanceResponse> {
  if (!BASE || !KEY) throw new Error("Evolution API não configurada");
  const url = webhookUrl();
  const body: Record<string, unknown> = {
    instanceName,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
  };
  if (url) {
    body.webhook = {
      url,
      enabled: true,
      webhook_by_events: false,
      webhook_base64: false,
      events: DEFAULT_WEBHOOK_EVENTS,
    };
  }
  const res = await fetch(`${BASE}/instance/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`createInstance failed: ${res.status} ${text.slice(0, 200)}`);
  }
  try {
    return text ? (JSON.parse(text) as CreateInstanceResponse) : {};
  } catch {
    return {};
  }
}

// Evolution v2: POST /webhook/set/{instance}
// (força webhook em instâncias já criadas ou reaplicação após mudanças)
export async function setInstanceWebhook(
  instanceName: string,
  opts?: { url?: string; events?: readonly string[] },
): Promise<{ ok: boolean; message?: string }> {
  if (!BASE || !KEY) throw new Error("Evolution API não configurada");
  const url = opts?.url ?? webhookUrl();
  if (!url) {
    return { ok: false, message: "APP_URL / NEXT_PUBLIC_APP_URL não configurada" };
  }
  const events = opts?.events ?? DEFAULT_WEBHOOK_EVENTS;
  const payload = {
    url,
    enabled: true,
    webhook_by_events: false,
    webhook_base64: false,
    events,
  };
  // Evolution v2 aceita ambos os formatos — alguns builds exigem payload
  // wrapped em { webhook: {...} }. Tentamos o wrapped primeiro.
  for (const body of [{ webhook: payload }, payload]) {
    const res = await fetch(`${BASE}/webhook/set/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    // 400 provavelmente = formato errado — tenta próximo
    if (res.status !== 400) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: `setWebhook ${res.status}: ${text.slice(0, 160)}` };
    }
  }
  return { ok: false, message: "Evolution recusou ambos os formatos de webhook" };
}

export async function getInstanceWebhook(instanceName: string): Promise<{
  url?: string;
  enabled?: boolean;
  events?: string[];
} | null> {
  if (!BASE || !KEY) return null;
  const res = await fetch(`${BASE}/webhook/find/${instanceName}`, {
    headers: { apikey: KEY },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    url?: string;
    enabled?: boolean;
    events?: string[];
    webhook?: { url?: string; enabled?: boolean; events?: string[] };
  };
  return {
    url: json.url ?? json.webhook?.url,
    enabled: json.enabled ?? json.webhook?.enabled,
    events: json.events ?? json.webhook?.events,
  };
}

export async function getInstanceQr(instanceName: string): Promise<EvolutionQr> {
  if (!BASE || !KEY) throw new Error("Evolution API não configurada");
  const res = await fetch(`${BASE}/instance/connect/${instanceName}`, {
    headers: { apikey: KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`instanceQr failed: ${res.status} ${body.slice(0, 120)}`) as Error & {
      status: number;
    };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<EvolutionQr>;
}

export async function instanceExists(instanceName: string): Promise<boolean> {
  const info = await fetchInstanceInfo(instanceName).catch(() => null);
  return !!info;
}

export type EvolutionConnectionState = "open" | "connecting" | "close" | "unknown";

export async function getInstanceStatus(instanceName: string): Promise<{
  state: EvolutionConnectionState;
  number?: string;
}> {
  if (!BASE || !KEY) throw new Error("Evolution API não configurada");
  const res = await fetch(`${BASE}/instance/connectionState/${instanceName}`, {
    headers: { apikey: KEY },
    cache: "no-store",
  });
  if (!res.ok) return { state: "unknown" };
  const json = (await res.json()) as { instance?: { state?: string; number?: string }; state?: string };
  const raw = json.instance?.state ?? json.state ?? "unknown";
  const state: EvolutionConnectionState =
    raw === "open" || raw === "connecting" || raw === "close" ? raw : "unknown";
  return { state, number: json.instance?.number };
}

export async function fetchInstanceInfo(instanceName: string): Promise<{
  number?: string;
  profileName?: string;
  profilePictureUrl?: string;
} | null> {
  if (!BASE || !KEY) return null;
  const res = await fetch(`${BASE}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`, {
    headers: { apikey: KEY },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Array<{
    instance?: { owner?: string; profileName?: string; profilePictureUrl?: string };
  }>;
  const inst = Array.isArray(json) ? json[0]?.instance : null;
  if (!inst) return null;
  return {
    number: inst.owner?.replace(/@.*/, ""),
    profileName: inst.profileName,
    profilePictureUrl: inst.profilePictureUrl,
  };
}

export async function logoutInstance(instanceName: string): Promise<void> {
  if (!BASE || !KEY) throw new Error("Evolution API não configurada");
  const res = await fetch(`${BASE}/instance/logout/${instanceName}`, {
    method: "DELETE",
    headers: { apikey: KEY },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`logoutInstance failed: ${res.status} ${await res.text()}`);
  }
}

export async function deleteInstance(instanceName: string): Promise<void> {
  if (!BASE || !KEY) throw new Error("Evolution API não configurada");
  const res = await fetch(`${BASE}/instance/delete/${instanceName}`, {
    method: "DELETE",
    headers: { apikey: KEY },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`deleteInstance failed: ${res.status} ${await res.text()}`);
  }
}

export async function restartInstance(instanceName: string): Promise<void> {
  if (!BASE || !KEY) throw new Error("Evolution API não configurada");
  const res = await fetch(`${BASE}/instance/restart/${instanceName}`, {
    method: "PUT",
    headers: { apikey: KEY },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`restartInstance failed: ${res.status} ${await res.text()}`);
  }
}
