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

export async function createEvolutionInstance(instanceName: string) {
  if (!BASE || !KEY) throw new Error("Evolution API não configurada");
  const res = await fetch(`${BASE}/instance/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: KEY,
    },
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    }),
  });
  if (!res.ok) throw new Error(`createInstance failed: ${res.status}`);
  return res.json();
}

export async function getInstanceQr(instanceName: string) {
  if (!BASE || !KEY) throw new Error("Evolution API não configurada");
  const res = await fetch(`${BASE}/instance/connect/${instanceName}`, {
    headers: { apikey: KEY },
  });
  if (!res.ok) throw new Error(`instanceQr failed: ${res.status}`);
  return res.json() as Promise<{ base64?: string; code?: string }>;
}
