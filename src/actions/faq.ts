"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export type FaqState = { ok: boolean; message: string | null };
const INITIAL: FaqState = { ok: true, message: null };

export async function createFaqAction(_prev: FaqState, fd: FormData): Promise<FaqState> {
  const ctx = await requireRole(["admin", "secretaria"]);
  const question = String(fd.get("question") ?? "").trim();
  const answer = String(fd.get("answer") ?? "").trim();
  const category = (String(fd.get("category") ?? "").trim() || null) as string | null;
  if (!question || !answer) return { ok: false, message: "Pergunta e resposta são obrigatórias" };

  const admin = createAdminClient();
  const { error } = await admin.from("whatsapp_faq").insert({
    workspace_id: ctx.workspace.id,
    question,
    answer,
    category,
    active: true,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard/ai/faq");
  return { ok: true, message: "FAQ adicionada" };
}

export async function updateFaqAction(_prev: FaqState, fd: FormData): Promise<FaqState> {
  const ctx = await requireRole(["admin", "secretaria"]);
  const id = String(fd.get("id") ?? "");
  const question = String(fd.get("question") ?? "").trim();
  const answer = String(fd.get("answer") ?? "").trim();
  const category = (String(fd.get("category") ?? "").trim() || null) as string | null;
  if (!id) return { ok: false, message: "ID ausente" };
  if (!question || !answer) return { ok: false, message: "Pergunta e resposta são obrigatórias" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("whatsapp_faq")
    .update({ question, answer, category } as never)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard/ai/faq");
  return { ok: true, message: "Atualizado" };
}

export async function toggleFaqAction(_prev: FaqState, fd: FormData): Promise<FaqState> {
  const ctx = await requireRole(["admin", "secretaria"]);
  const id = String(fd.get("id") ?? "");
  const active = fd.get("active") === "true";
  if (!id) return { ok: false, message: "ID ausente" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("whatsapp_faq")
    .update({ active: !active } as never)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/ai/faq");
  return { ok: true, message: null };
}

export async function deleteFaqAction(_prev: FaqState, fd: FormData): Promise<FaqState> {
  const ctx = await requireRole(["admin", "secretaria"]);
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, message: "ID ausente" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("whatsapp_faq")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/ai/faq");
  return { ok: true, message: "Removida" };
}

export { INITIAL as INITIAL_FAQ_STATE };
