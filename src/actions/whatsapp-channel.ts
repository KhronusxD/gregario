"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireWorkspace } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createEvolutionInstance,
  deleteInstance,
  getInstanceQr,
  getInstanceStatus,
  logoutInstance,
  restartInstance,
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

  const { error } = await admin
    .from("workspaces")
    .update({ evolution_instance: instance } as never)
    .eq("id", ctx.workspace.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard/settings/whatsapp");
  return { ok: true, message: "Instância criada. Escaneie o QR para conectar." };
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
