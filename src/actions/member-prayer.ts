"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/auth/member-session";

const CreateSchema = z.object({
  slug: z.string().min(1),
  body: z.string().min(3).max(500),
  isAnonymous: z.boolean().optional(),
});

export async function createPrayerRequestAction(formData: FormData) {
  const parsed = CreateSchema.safeParse({
    slug: formData.get("slug"),
    body: formData.get("body"),
    isAnonymous: formData.get("anonymous") === "on",
  });
  if (!parsed.success) return;

  const member = await requireMember(parsed.data.slug);
  const supabase = createAdminClient();
  await supabase.from("prayer_requests").insert({
    workspace_id: member.workspace_id,
    member_id: member.id,
    is_anonymous: parsed.data.isAnonymous ?? false,
    body: parsed.data.body,
    status: "open",
    visibility: "public",
  } as never);

  revalidatePath(`/${parsed.data.slug}/app/prayer`);
}

export async function intercedeAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const requestId = String(formData.get("requestId") ?? "");
  if (!slug || !requestId) return;

  const member = await requireMember(slug);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("prayer_intercessors")
    .insert({ request_id: requestId, member_id: member.id } as never);

  if (!error) {
    const { count } = await supabase
      .from("prayer_intercessors")
      .select("id", { count: "exact", head: true })
      .eq("request_id", requestId);
    await supabase
      .from("prayer_requests")
      .update({ intercessors: count ?? 0 } as never)
      .eq("id", requestId);
  }

  revalidatePath(`/${slug}/app/prayer`);
}
