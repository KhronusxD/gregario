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
  // Evolution v2 atual espera `text` no top-level. Builds antigos usavam
  // `textMessage: { text }` — não usar mais (causa 400 "instance requires
  // property text").
  const res = await fetch(`${BASE}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: KEY,
    },
    body: JSON.stringify({
      number: normalizePhone(phone),
      text,
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
    // Evolution v2 aceita tanto camelCase quanto snake_case em alguns builds;
    // mandamos os dois pra maximizar compatibilidade.
    body.webhook = {
      url,
      enabled: true,
      webhookByEvents: false,
      webhook_by_events: false,
      webhookBase64: false,
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

// Evolution v2: POST /webhook/set/{instance} (alguns builds aceitam PUT)
// Formatos variam entre versões — tentamos múltiplas combinações
// (camelCase/snake_case × wrapped/flat × POST/PUT).
export async function setInstanceWebhook(
  instanceName: string,
  opts?: { url?: string; events?: readonly string[] },
): Promise<{ ok: boolean; message?: string; attempts?: Array<{ method: string; status: number; body: string }> }> {
  if (!BASE || !KEY) throw new Error("Evolution API não configurada");
  const url = opts?.url ?? webhookUrl();
  if (!url) {
    return { ok: false, message: "APP_URL / NEXT_PUBLIC_APP_URL não configurada" };
  }
  const events = opts?.events ?? DEFAULT_WEBHOOK_EVENTS;

  const variants: Array<Record<string, unknown>> = [
    // v2 moderno, wrapped, camelCase
    { webhook: { url, enabled: true, webhookByEvents: false, webhookBase64: false, events } },
    // v2 moderno, flat, camelCase
    { url, enabled: true, webhookByEvents: false, webhookBase64: false, events },
    // fallback snake_case
    { webhook: { url, enabled: true, webhook_by_events: false, webhook_base64: false, events } },
    { url, enabled: true, webhook_by_events: false, webhook_base64: false, events },
  ];

  const methods: Array<"POST" | "PUT"> = ["POST", "PUT"];
  const attempts: Array<{ method: string; status: number; body: string }> = [];

  for (const method of methods) {
    for (const body of variants) {
      const res = await fetch(`${BASE}/webhook/set/${instanceName}`, {
        method,
        headers: { "Content-Type": "application/json", apikey: KEY },
        body: JSON.stringify(body),
      });
      const text = await res.text().catch(() => "");
      attempts.push({ method, status: res.status, body: text.slice(0, 200) });
      if (res.ok) return { ok: true, attempts };
      if (res.status !== 400 && res.status !== 404 && res.status !== 405) {
        return { ok: false, message: `setWebhook ${method} ${res.status}: ${text.slice(0, 160)}`, attempts };
      }
    }
  }
  const last = attempts[attempts.length - 1];
  return {
    ok: false,
    message: `Evolution recusou todas as variações. Último: ${last?.status} ${last?.body}`,
    attempts,
  };
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

/**
 * Perfil completo (nome + foto) de um contato. Evolution v2:
 * POST /chat/fetchProfile/{instance} body { number }.
 * Retorna shape variável entre versões — leitura defensiva.
 */
export async function fetchContactProfile(
  instanceName: string,
  phone: string,
): Promise<{ name: string | null; pictureUrl: string | null } | null> {
  if (!BASE || !KEY) return null;
  try {
    const digits = phone.replace(/\D/g, "");
    const res = await fetch(`${BASE}/chat/fetchProfile/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY },
      body: JSON.stringify({ number: digits }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      name?: string;
      pushName?: string;
      profileName?: string;
      picture?: string;
      profilePictureUrl?: string;
      profilePicUrl?: string;
    };
    return {
      name: json.name ?? json.pushName ?? json.profileName ?? null,
      pictureUrl: json.picture ?? json.profilePictureUrl ?? json.profilePicUrl ?? null,
    };
  } catch (err) {
    console.error("[fetchContactProfile] error:", err);
    return null;
  }
}

/**
 * Foto de perfil de um contato. Evolution v2 expõe via
 * POST /chat/fetchProfilePictureUrl/{instance}, body { number }.
 * O número aceito pelo Evolution é o JID puro ("5511999...@s.whatsapp.net")
 * ou só os dígitos — mandamos só dígitos. Retorna URL com TTL (foto de perfil
 * do WhatsApp Cloud), por isso vale re-fetchar periodicamente.
 */
export async function fetchProfilePicture(
  instanceName: string,
  phone: string,
): Promise<string | null> {
  if (!BASE || !KEY) return null;
  try {
    const digits = phone.replace(/\D/g, "");
    const res = await fetch(`${BASE}/chat/fetchProfilePictureUrl/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY },
      body: JSON.stringify({ number: digits }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { profilePictureUrl?: string; profilePicUrl?: string };
    return json.profilePictureUrl ?? json.profilePicUrl ?? null;
  } catch (err) {
    console.error("[fetchProfilePicture] error:", err);
    return null;
  }
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
