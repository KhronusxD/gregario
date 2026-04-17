import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

type Payload = {
  w: string; // workspace_id
  i: string; // evolution instance name
  exp: number;
};

const DEFAULT_TTL_SECONDS = 60 * 30; // 30min

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? 0 : 4 - (str.length % 4);
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad), "base64");
}

function sign(payload: string): string {
  const secret = process.env.MEMBER_SESSION_SECRET;
  if (!secret) throw new Error("MEMBER_SESSION_SECRET não configurada");
  // Domain-separation: este HMAC é só pra connect tokens
  return b64url(createHmac("sha256", `connect:${secret}`).update(payload).digest());
}

export function encodeConnectToken(input: { workspaceId: string; instance: string; ttlSeconds?: number }): {
  token: string;
  expiresAt: Date;
} {
  const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload: Payload = { w: input.workspaceId, i: input.instance, exp };
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body);
  return { token: `${body}.${sig}`, expiresAt: new Date(exp * 1000) };
}

export function verifyConnectToken(token: string): Payload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(b64urlDecode(body).toString("utf8")) as Payload;
    if (parsed.exp * 1000 < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
