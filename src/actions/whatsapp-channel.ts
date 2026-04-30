"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireWorkspace } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createEvolutionInstance,
  deleteInstance,
  fetchContactProfile,
  getInstanceQr,
  getInstanceStatus,
  getInstanceWebhook,
  logoutInstance,
  restartInstance,
  setInstanceWebhook,
  fetchInstanceInfo,
} from "@/lib/whatsapp/evolution";
import { encodeConnectToken } from "@/lib/whatsapp/connect-token";

export type WhatsappChannelState = { ok: boolean; message: string | null };

function instanceFor(slug: string): string {
  return `ws_${slug}`;
}

async function loadInstance(): Promise<{ workspaceId: string; instance: string | null; slug: string }> {
  const ctx = await requireWorkspace();
  return {
    workspaceId: ctx.workspace.id,
    instance: (ctx.workspace as { evolution_instance?: string | null }).evolution_instance ?? null,
    slug: ctx.workspace.slug,
  };
}

export async function createChannelAction(
  _prev: WhatsappChannelState,
  _fd: FormData,
): Promise<WhatsappChannelState> {
  const ctx = await requireRole(["admin"]);
  const instance = instanceFor(ctx.workspace.slug);
  const admin = createAdminClient();

  try {
    await createEvolutionInstance(instance);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao criar instância";
    if (!/already|exists|409/i.test(msg)) {
      return { ok: false, message: msg };
    }
  }

  // Garante webhook — create nem sempre aplica corretamente em todos os builds
  await setInstanceWebhook(instance).catch(() => undefined);

  const { error } = await admin
    .from("workspaces")
    .update({ evolution_instance: instance, whatsapp_active: true } as never)
    .eq("id", ctx.workspace.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard/settings/whatsapp");
  return { ok: true, message: "Instância criada. Escaneie o QR para conectar." };
}

export async function syncWebhookAction(
  _prev: WhatsappChannelState,
  _fd: FormData,
): Promise<WhatsappChannelState> {
  const { instance } = await loadInstance();
  if (!instance) return { ok: false, message: "Sem instância configurada" };
  const r = await setInstanceWebhook(instance);
  if (!r.ok) {
    const debug = r.attempts
      ? "\nTentativas:\n" + r.attempts.map((a) => `${a.method} → ${a.status} ${a.body}`).join("\n")
      : "";
    return { ok: false, message: (r.message ?? "Falha ao aplicar webhook") + debug };
  }
  revalidatePath("/dashboard/settings/whatsapp");
  return { ok: true, message: "Webhook aplicado." };
}

export async function getWebhookStatusAction(): Promise<{
  url: string | null;
  enabled: boolean;
  events: string[];
  expectedUrl: string | null;
  healthy: boolean;
}> {
  const { instance } = await loadInstance();
  const origin = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const expectedUrl = origin ? `${origin.replace(/\/$/, "")}/api/webhooks/evolution` : null;
  if (!instance) {
    return { url: null, enabled: false, events: [], expectedUrl, healthy: false };
  }
  const info = await getInstanceWebhook(instance).catch(() => null);
  const url = info?.url ?? null;
  const enabled = !!info?.enabled;
  const events = info?.events ?? [];
  const healthy = !!(url && enabled && expectedUrl && url === expectedUrl && events.length > 0);
  return { url, enabled, events, expectedUrl, healthy };
}

export async function regenerateQrAction(
  _prev: WhatsappChannelState,
  _fd: FormData,
): Promise<WhatsappChannelState> {
  const { instance } = await loadInstance();
  if (!instance) return { ok: false, message: "Nenhuma instância configurada" };
  try {
    await getInstanceQr(instance);
    revalidatePath("/dashboard/settings/whatsapp");
    return { ok: true, message: "Novo QR gerado" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha" };
  }
}

export async function logoutChannelAction(
  _prev: WhatsappChannelState,
  _fd: FormData,
): Promise<WhatsappChannelState> {
  const ctx = await requireRole(["admin"]);
  const instance = (ctx.workspace as { evolution_instance?: string | null }).evolution_instance;
  if (!instance) return { ok: false, message: "Nada para desconectar" };
  try {
    await logoutInstance(instance);
    revalidatePath("/dashboard/settings/whatsapp");
    return { ok: true, message: "WhatsApp desconectado" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha" };
  }
}

export async function restartChannelAction(
  _prev: WhatsappChannelState,
  _fd: FormData,
): Promise<WhatsappChannelState> {
  const ctx = await requireRole(["admin"]);
  const instance = (ctx.workspace as { evolution_instance?: string | null }).evolution_instance;
  if (!instance) return { ok: false, message: "Sem instância" };
  try {
    await restartInstance(instance);
    revalidatePath("/dashboard/settings/whatsapp");
    return { ok: true, message: "Instância reiniciada" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha" };
  }
}

export async function deleteChannelAction(
  _prev: WhatsappChannelState,
  _fd: FormData,
): Promise<WhatsappChannelState> {
  const ctx = await requireRole(["admin"]);
  const instance = (ctx.workspace as { evolution_instance?: string | null }).evolution_instance;
  if (!instance) return { ok: false, message: "Sem instância" };
  try {
    await deleteInstance(instance);
  } catch (e) {
    // segue mesmo com erro — pode já estar removido no servidor Evolution
    console.error("[deleteChannel]", e);
  }
  const admin = createAdminClient();
  await admin
    .from("workspaces")
    .update({ evolution_instance: null } as never)
    .eq("id", ctx.workspace.id);
  revalidatePath("/dashboard/settings/whatsapp");
  return { ok: true, message: "Canal removido" };
}

export async function createConnectLinkAction(): Promise<{ ok: boolean; url?: string; message?: string }> {
  const ctx = await requireRole(["admin"]);
  const instance = (ctx.workspace as { evolution_instance?: string | null }).evolution_instance;
  if (!instance) return { ok: false, message: "Crie a instância primeiro" };
  const origin = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const { token, expiresAt } = encodeConnectToken({ workspaceId: ctx.workspace.id, instance });
  const path = `/connect/${token}`;
  const url = origin ? `${origin.replace(/\/$/, "")}${path}` : path;
  return { ok: true, url, message: `Link válido até ${expiresAt.toLocaleTimeString("pt-BR")}` };
}

export type ChannelStatus = {
  state: "open" | "connecting" | "close" | "unknown" | "none";
  number: string | null;
  profileName: string | null;
  profilePictureUrl: string | null;
};

export async function getChannelStatusAction(): Promise<ChannelStatus> {
  const { instance } = await loadInstance();
  if (!instance) return { state: "none", number: null, profileName: null, profilePictureUrl: null };
  const [status, info] = await Promise.all([
    getInstanceStatus(instance).catch(() => ({ state: "unknown" as const, number: undefined })),
    fetchInstanceInfo(instance).catch(() => null),
  ]);
  return {
    state: status.state,
    number: info?.number ?? status.number ?? null,
    profileName: info?.profileName ?? null,
    profilePictureUrl: info?.profilePictureUrl ?? null,
  };
}

export async function getChannelQrAction(): Promise<{ base64: string | null; pairingCode: string | null; message?: string }> {
  const { instance } = await loadInstance();
  if (!instance) return { base64: null, pairingCode: null, message: "Sem instância" };
  try {
    const qr = await getInstanceQr(instance);
    return { base64: qr.base64 ?? null, pairingCode: qr.pairingCode ?? qr.code ?? null };
  } catch (e) {
    return { base64: null, pairingCode: null, message: e instanceof Error ? e.message : "Falha" };
  }
}

export type BackfillResult = {
  ok: boolean;
  message: string | null;
  scanned?: number;
  updated?: number;
  failed?: number;
};

/**
 * Varre as conversas do workspace e busca nome (display_name) e foto
 * (avatar_url) via Evolution pra cada contato. Concorrência limitada
 * em CONCURRENCY pra não inundar a Evolution.
 *
 * Pula contatos que já têm os 2 campos preenchidos.
 */
const CONCURRENCY = 5;

export async function backfillContactsAction(
  _prev: BackfillResult,
  _fd: FormData,
): Promise<BackfillResult> {
  const { workspaceId, instance } = await loadInstance();
  if (!instance) return { ok: false, message: "Canal WhatsApp não conectado" };

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("whatsapp_conversations")
    .select("id, phone, display_name, avatar_url")
    .eq("workspace_id", workspaceId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) return { ok: false, message: error.message };

  const list = (rows ?? []) as Array<{
    id: string;
    phone: string;
    display_name: string | null;
    avatar_url: string | null;
  }>;
  const pending = list.filter((c) => !c.display_name || !c.avatar_url);

  let updated = 0;
  let failed = 0;

  const queue = [...pending];
  async function worker() {
    while (queue.length > 0) {
      const c = queue.shift();
      if (!c) return;
      try {
        const profile = await fetchContactProfile(instance!, c.phone);
        if (!profile) {
          failed++;
          continue;
        }
        const patch: Record<string, unknown> = {};
        if (!c.display_name && profile.name) patch.display_name = profile.name;
        if (!c.avatar_url && profile.pictureUrl) {
          patch.avatar_url = profile.pictureUrl;
          patch.avatar_fetched_at = new Date().toISOString();
        }
        if (Object.keys(patch).length === 0) continue;
        const { error: upErr } = await supabase
          .from("whatsapp_conversations")
          .update(patch as never)
          .eq("id", c.id);
        if (upErr) failed++;
        else updated++;
      } catch {
        failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  revalidatePath("/dashboard/whatsapp");
  return {
    ok: true,
    message: `${updated} atualizada(s) · ${failed} falha(s)`,
    scanned: pending.length,
    updated,
    failed,
  };
}
