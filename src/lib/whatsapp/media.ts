import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "whatsapp-media";

export async function fetchMetaMediaUrl(params: {
  mediaId: string;
  token: string;
}): Promise<{ url: string; mimeType: string | null } | null> {
  const meta = await fetch(`https://graph.facebook.com/v22.0/${params.mediaId}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!meta.ok) return null;
  const data = (await meta.json()) as { url?: string; mime_type?: string };
  if (!data.url) return null;
  return { url: data.url, mimeType: data.mime_type ?? null };
}

export async function downloadMetaMedia(params: {
  url: string;
  token: string;
}): Promise<{ buffer: ArrayBuffer; mimeType: string } | null> {
  const res = await fetch(params.url, {
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) return null;
  const buffer = await res.arrayBuffer();
  const mimeType = res.headers.get("content-type") || "application/octet-stream";
  return { buffer, mimeType };
}

export async function uploadMediaToStorage(params: {
  workspaceId: string;
  conversationId: string;
  buffer: ArrayBuffer;
  mimeType: string;
  ext?: string;
}): Promise<{ publicUrl: string | null; path: string | null }> {
  const supabase = createAdminClient();
  const ext = params.ext ?? extFromMime(params.mimeType);
  const path = `${params.workspaceId}/${params.conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, params.buffer, {
    contentType: params.mimeType,
    upsert: false,
  });
  if (error) {
    console.error("[media upload]", error.message);
    return { publicUrl: null, path: null };
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl ?? null, path };
}

function extFromMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("m4a") || mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg") || mime.includes("opus")) return "ogg";
  if (mime.includes("pdf")) return "pdf";
  return "bin";
}
