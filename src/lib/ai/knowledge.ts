import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type KnowledgeFile = {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  enabled: boolean;
  error: string | null;
  created_at: string;
};

export const KNOWLEDGE_BUCKET = "knowledge-base";
export const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB por arquivo
export const MAX_TOTAL_CHARS = 9000; // cap total injetado no prompt

export const SUPPORTED_MIME_TYPES: Record<string, "text" | "csv" | "markdown"> = {
  "text/plain": "text",
  "text/csv": "csv",
  "text/markdown": "markdown",
  "application/csv": "csv",
};

export async function extractTextFromBuffer(params: {
  buffer: ArrayBuffer;
  mimeType: string;
}): Promise<{ text: string | null; error?: string }> {
  const kind = SUPPORTED_MIME_TYPES[params.mimeType];
  if (!kind) {
    return { text: null, error: `tipo não suportado: ${params.mimeType} (apenas txt, md, csv)` };
  }
  try {
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(params.buffer).trim();
    if (!text) return { text: null, error: "arquivo vazio" };
    // Trim e normaliza whitespace pra economizar tokens
    const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").slice(0, 50_000);
    return { text: normalized };
  } catch (err) {
    return { text: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function loadKnowledgeForPrompt(workspaceId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_knowledge_files")
    .select("filename, extracted_text")
    .eq("workspace_id", workspaceId)
    .eq("enabled", true)
    .not("extracted_text", "is", null)
    .order("created_at", { ascending: true });

  const files = (data ?? []) as Array<{ filename: string; extracted_text: string }>;
  if (files.length === 0) return "";

  let total = 0;
  const parts: string[] = [];
  for (const f of files) {
    const header = `### ${f.filename}\n`;
    const remaining = MAX_TOTAL_CHARS - total - header.length;
    if (remaining <= 200) break;
    const snippet = f.extracted_text.slice(0, remaining);
    parts.push(header + snippet);
    total += header.length + snippet.length;
    if (total >= MAX_TOTAL_CHARS) break;
  }
  return parts.join("\n\n---\n\n");
}

export async function listKnowledgeFiles(workspaceId: string): Promise<KnowledgeFile[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_knowledge_files")
    .select("id, filename, mime_type, size_bytes, enabled, error, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  return (data ?? []) as KnowledgeFile[];
}
