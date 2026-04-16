"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEvolutionInstance, getInstanceQr } from "@/lib/whatsapp/evolution";

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

export type OnboardingState =
  | { errors?: Record<string, string[]>; message?: string; ok?: boolean }
  | undefined;

export async function saveChurchStep(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const ctx = await requireRole(["admin"]);
  const parsed = ChurchSchema.safeParse({
    name: formData.get("name"),
    denomination: formData.get("denomination"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    service_schedule: formData.get("service_schedule"),
    pastor_phone: formData.get("pastor_phone"),
    welcome_message: formData.get("welcome_message"),
    primary_color: formData.get("primary_color"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
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
    })
    .eq("id", ctx.workspace.id);
  if (error) return { message: error.message };

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
    await createEvolutionInstance(instanceName);
    const qr = await getInstanceQr(instanceName);
    await admin
      .from("workspaces")
      .update({ evolution_instance: instanceName, onboarding_step: 3 })
      .eq("id", ctx.workspace.id);
    return { ok: true, message: qr.base64 ? "QR gerado — escaneie no WhatsApp." : "Instância criada." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Falha ao conectar." };
  }
}

export async function skipWhatsappStep() {
  const ctx = await requireRole(["admin"]);
  const supabase = await createClient();
  await supabase.from("workspaces").update({ onboarding_step: 4 }).eq("id", ctx.workspace.id);
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
    const supabase = await createClient();
    await supabase.from("workspaces").update({ onboarding_step: 5 }).eq("id", ctx.workspace.id);
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

  if (rows.length > 0) {
    const supabase = await createClient();
    await supabase.from("members").insert(
      rows.map((r) => ({
        workspace_id: ctx.workspace.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        status: "membro_ativo",
      })),
    );
  }

  const supabase = await createClient();
  await supabase.from("workspaces").update({ onboarding_step: 5 }).eq("id", ctx.workspace.id);
  redirect("/onboarding/done");
}

export async function finishOnboarding() {
  const ctx = await requireRole(["admin"]);
  const supabase = await createClient();
  await supabase
    .from("workspaces")
    .update({ onboarding_completed_at: new Date().toISOString(), onboarding_step: 99 })
    .eq("id", ctx.workspace.id);
  redirect("/dashboard");
}
