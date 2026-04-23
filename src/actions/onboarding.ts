"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createEvolutionInstance,
  deleteInstance,
  getInstanceQr,
  instanceExists,
  setInstanceWebhook,
} from "@/lib/whatsapp/evolution";

const ChurchSchema = z.object({
  name: z.string().min(2).trim(),
  denomination: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  service_schedule: z.string().optional().or(z.literal("")),
  pastor_phone: z.string().optional().or(z.literal("")),
  welcome_message: z.string().optional().or(z.literal("")),
  primary_color: z.string().optional().or(z.literal("")),
});

export type OnboardingChurchValues = {
  name?: string;
  denomination?: string;
  address?: string;
  phone?: string;
  service_schedule?: string;
  pastor_phone?: string;
  welcome_message?: string;
  primary_color?: string;
};

export type OnboardingState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      ok?: boolean;
      values?: OnboardingChurchValues;
      qr?: {
        base64: string | null;
        pairingCode: string | null;
      };
    }
  | undefined;

export async function saveChurchStep(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const ctx = await requireRole(["admin"]);
  const values: OnboardingChurchValues = {
    name: (formData.get("name") as string) ?? "",
    denomination: (formData.get("denomination") as string) ?? "",
    address: (formData.get("address") as string) ?? "",
    phone: (formData.get("phone") as string) ?? "",
    service_schedule: (formData.get("service_schedule") as string) ?? "",
    pastor_phone: (formData.get("pastor_phone") as string) ?? "",
    welcome_message: (formData.get("welcome_message") as string) ?? "",
    primary_color: (formData.get("primary_color") as string) ?? "",
  };
  const parsed = ChurchSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("workspaces")
    .update({
      name: parsed.data.name,
      denomination: parsed.data.denomination || null,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      service_schedule: parsed.data.service_schedule || null,
      pastor_phone: parsed.data.pastor_phone || null,
      welcome_message: parsed.data.welcome_message || null,
      primary_color: parsed.data.primary_color || null,
      onboarding_step: 2,
    } as never)
    .eq("id", ctx.workspace.id);
  if (error) return { message: error.message, values };

  revalidatePath("/onboarding");
  redirect("/onboarding/faq");
}

export async function saveFaqStep(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const ctx = await requireRole(["admin"]);
  const admin = createAdminClient();

  const questions = formData.getAll("question").map((q) => String(q));
  const answers = formData.getAll("answer").map((a) => String(a));

  const entries = questions
    .map((q, i) => ({ question: q.trim(), answer: (answers[i] ?? "").trim() }))
    .filter((e) => e.question && e.answer);

  if (entries.length > 0) {
    await admin.from("whatsapp_faq").delete().eq("workspace_id", ctx.workspace.id);
    await admin.from("whatsapp_faq").insert(
      entries.map((e) => ({
        workspace_id: ctx.workspace.id,
        question: e.question,
        answer: e.answer,
      })),
    );
  }

  await admin
    .from("workspaces")
    .update({ onboarding_step: 3 })
    .eq("id", ctx.workspace.id);

  redirect("/onboarding/whatsapp");
}

export async function connectWhatsappStep(): Promise<OnboardingState> {
  const ctx = await requireRole(["admin"]);
  const admin = createAdminClient();

  const instanceName = `ws_${ctx.workspace.slug}`;
  try {
    const exists = await instanceExists(instanceName);
    let qr: { base64?: string; code?: string; pairingCode?: string } = {};

    if (!exists) {
      // Cria. Evolution v2 já retorna o QR no create.
      const created = await createEvolutionInstance(instanceName);
      if (created.qrcode) qr = created.qrcode;
    }

    // Garante webhook sempre — tanto em instâncias novas quanto nas que já existiam
    await setInstanceWebhook(instanceName).catch(() => undefined);

    // Se não veio do create, busca via /instance/connect (com tolerância a 404 transitório)
    if (!qr.base64 && !qr.pairingCode) {
      try {
        qr = await getInstanceQr(instanceName);
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (status === 404) {
          // Instância sumiu ou não inicializou ainda — limpa e manda recriar
          await deleteInstance(instanceName).catch(() => undefined);
          return {
            message:
              "Instância em estado inconsistente. Toque em Reiniciar conexão e tente de novo.",
          };
        }
        throw e;
      }
    }

    await admin
      .from("workspaces")
      .update({ evolution_instance: instanceName, onboarding_step: 3 } as never)
      .eq("id", ctx.workspace.id);

    return {
      ok: true,
      message: qr.base64 ? "Escaneie o QR Code no WhatsApp." : "Instância criada.",
      qr: {
        base64: qr.base64 ?? null,
        pairingCode: qr.pairingCode ?? qr.code ?? null,
      },
    };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Falha ao conectar." };
  }
}

export async function resetWhatsappStep(): Promise<OnboardingState> {
  const ctx = await requireRole(["admin"]);
  const admin = createAdminClient();
  const instanceName = `ws_${ctx.workspace.slug}`;

  // Tenta remover no Evolution — se já não existe, tudo bem
  await deleteInstance(instanceName).catch(() => undefined);

  await admin
    .from("workspaces")
    .update({ evolution_instance: null, whatsapp_active: false } as never)
    .eq("id", ctx.workspace.id);

  return { ok: true, message: "Conexão reiniciada. Clique em Gerar instância pra recomeçar." };
}

export async function completeWhatsappStep() {
  const ctx = await requireRole(["admin"]);
  const admin = createAdminClient();
  await admin
    .from("workspaces")
    .update({ onboarding_step: 4, whatsapp_active: true } as never)
    .eq("id", ctx.workspace.id);
  redirect("/onboarding/members");
}

export async function skipWhatsappStep() {
  const ctx = await requireRole(["admin"]);
  const admin = createAdminClient();
  await admin
    .from("workspaces")
    .update({ onboarding_step: 4 } as never)
    .eq("id", ctx.workspace.id);
  redirect("/onboarding/members");
}

const CSV_LINE = /^(.+?)[,;\t](.+?)(?:[,;\t](.*))?$/;

export async function importMembersStep(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const ctx = await requireRole(["admin"]);
  const raw = (formData.get("csv") ?? "") as string;
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    const admin = createAdminClient();
    await admin
      .from("workspaces")
      .update({ onboarding_step: 5 } as never)
      .eq("id", ctx.workspace.id);
    redirect("/onboarding/done");
  }

  const rows: Array<{ name: string; phone: string | null; email: string | null }> = [];
  for (const line of lines) {
    const m = CSV_LINE.exec(line);
    if (!m) continue;
    const name = m[1]?.trim();
    if (!name || name.toLowerCase() === "nome") continue;
    rows.push({
      name,
      phone: m[2]?.trim() || null,
      email: m[3]?.trim() || null,
    });
  }

  const admin = createAdminClient();
  if (rows.length > 0) {
    await admin.from("members").insert(
      rows.map((r) => ({
        workspace_id: ctx.workspace.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        status: "membro_ativo",
      })),
    );
  }

  await admin
    .from("workspaces")
    .update({ onboarding_step: 5 } as never)
    .eq("id", ctx.workspace.id);
  redirect("/onboarding/done");
}

export async function finishOnboarding() {
  const ctx = await requireRole(["admin"]);
  const admin = createAdminClient();
  await admin
    .from("workspaces")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      onboarding_step: 99,
    } as never)
    .eq("id", ctx.workspace.id);
  redirect("/dashboard");
}
