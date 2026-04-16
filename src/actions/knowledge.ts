"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { KNOWLEDGE_BUCKET, MAX_FILE_BYTES, SUPPORTED_MIME_TYPES, extractTextFromBuffer } from "@/lib/ai/knowledge";

export type KnowledgeFormState = { ok: boolean; message: string | null };

export async function uploadKnowledgeFile(
  _prev: KnowledgeFormState,
  formData: FormData,
): Promise<KnowledgeFormState> {
  const ctx = await requireWorkspace();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Selecione um arquivo" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: `Arquivo muito grande (max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)}MB)` };
  }
  const mime = file.type || "text/plain";
  if (!SUPPORTED_MIME_TYPES[mime]) {
    return { ok: false, message: "Formato não suportado. Use .txt, .md ou .csv" };
  }

  const buffer = await file.arrayBuffer();
  const extract = await extractTextFromBuffer({ buffer, mimeType: mime });
  if (!extract.text) {
    return { ok: false, message: extract.error ?? "Não foi possível ler o arquivo" };
  }

  const supabase = createAdminClient();
  const path = `${ctx.workspace.id}/${Date.now()}-${file.name}`;
  const { error: upErr } = await supabase.storage
    .from(KNOWLEDGE_BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: false });
  if (upErr) return { ok: false, message: `Upload falhou: ${upErr.message}` };

  const { error: dbErr } = await supabase.from("ai_knowledge_files").insert({
    workspace_id: ctx.workspace.id,
    filename: file.name,
    mime_type: mime,
    size_bytes: file.size,
    storage_path: path,
    extracted_text: extract.text,
    enabled: true,
  } as never);
  if (dbErr) {
    await supabase.storage.from(KNOWLEDGE_BUCKET).remove([path]);
    return { ok: false, message: `Falha ao salvar: ${dbErr.message}` };
  }

  revalidatePath("/dashboard/ai/knowledge");
  return { ok: true, message: `"${file.name}" adicionado` };
}

export async function toggleKnowledgeFile(
  _prev: KnowledgeFormState,
  formData: FormData,
): Promise<KnowledgeFormState> {
  const ctx = await requireWorkspace();
  const id = formData.get("id") as string | null;
  const nextEnabled = formData.get("enabled") === "true";
  if (!id) return { ok: false, message: "Arquivo inválido" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ai_knowledge_files")
    .update({ enabled: nextEnabled } as never)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/ai/knowledge");
  return { ok: true, message: null };
}

export async function deleteKnowledgeFile(
  _prev: KnowledgeFormState,
  formData: FormData,
): Promise<KnowledgeFormState> {
  const ctx = await requireWorkspace();
  const id = formData.get("id") as string | null;
  if (!id) return { ok: false, message: "Arquivo inválido" };
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_knowledge_files")
    .select("storage_path")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  const path = (data as { storage_path: string } | null)?.storage_path;
  if (path) await supabase.storage.from(KNOWLEDGE_BUCKET).remove([path]);
  const { error } = await supabase
    .from("ai_knowledge_files")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/ai/knowledge");
  return { ok: true, message: "Arquivo removido" };
}
