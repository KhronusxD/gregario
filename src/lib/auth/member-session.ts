import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE_NAME = "mg_member";
const TTL_SECONDS = 60 * 60 * 24 * 30;

type Payload = {
  m: string;
  w: string;
  s: string;
  exp: number;
};

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? 0 : 4 - (str.length % 4);
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad), "base64");
}

function sign(payload: string): string {
  const secret = process.env.MEMBER_SESSION_SECRET;
  if (!secret) throw new Error("MEMBER_SESSION_SECRET não configurada");
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

export function encodeMemberToken(input: {
  memberId: string;
  workspaceId: string;
  workspaceSlug: string;
}): { token: string; expires: Date } {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload: Payload = {
    m: input.memberId,
    w: input.workspaceId,
    s: input.workspaceSlug,
    exp,
  };
  const json = JSON.stringify(payload);
  const body = b64url(json);
  const sig = sign(body);
  return { token: `${body}.${sig}`, expires: new Date(exp * 1000) };
}

function verifyToken(token: string): Payload | null {
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

export async function setMemberCookie(input: {
  memberId: string;
  workspaceId: string;
  workspaceSlug: string;
}) {
  const { token, expires } = encodeMemberToken(input);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function clearMemberCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const getCurrentMember = cache(
  async (workspaceSlug: string) => {
    const store = await cookies();
    const raw = store.get(COOKIE_NAME)?.value;
    if (!raw) return null;
    const payload = verifyToken(raw);
    if (!payload || payload.s !== workspaceSlug) return null;

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("members")
      .select("id, name, phone, email, status, group_id, birth_date, workspace_id")
      .eq("id", payload.m)
      .eq("workspace_id", payload.w)
      .maybeSingle();
    return data as {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      status: string;
      group_id: string | null;
      birth_date: string | null;
      workspace_id: string;
    } | null;
  },
);

export async function requireMember(workspaceSlug: string) {
  const member = await getCurrentMember(workspaceSlug);
  if (!member) redirect(`/${workspaceSlug}/login`);
  return member;
}
