"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const ContentSchema = z.object({
  title: z.string().min(3).trim(),
  kind: z.enum(["devocional", "resumo_culto", "seminario"]),
  body: z.string().optional().or(z.literal("")),
  youtube_url: z.string().url().optional().or(z.literal("")),
  spotify_url: z.string().url().optional().or(z.literal("")),
  thumbnail_url: z.string().url().optional().or(z.literal("")),
  status: z.enum(["rascunho", "publicado"]).default("publicado"),
});

export type ContentFormState =
  | { errors?: Record<string, string[]>; message?: string }
  | undefined;

export async function createContentAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  const ctx = await requireRole(["admin", "secretaria"]);
  const parsed = ContentSchema.safeParse({
    title: formData.get("title"),
    kind: formData.get("kind"),
    body: formData.get("body"),
    youtube_url: formData.get("youtube_url"),
    spotify_url: formData.get("spotify_url"),
    thumbnail_url: formData.get("thumbnail_url"),
    status: formData.get("status") || "publicado",
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.from("content_items").insert({
    workspace_id: ctx.workspace.id,
    title: parsed.data.title,
    kind: parsed.data.kind,
    body: parsed.data.body || null,
    youtube_url: parsed.data.youtube_url || null,
    spotify_url: parsed.data.spotify_url || null,
    thumbnail_url: parsed.data.thumbnail_url || null,
    status: parsed.data.status,
    published_at: parsed.data.status === "publicado" ? new Date().toISOString() : null,
  });
  if (error) return { message: error.message };

  revalidatePath("/dashboard/content");
  redirect("/dashboard/content");
}
