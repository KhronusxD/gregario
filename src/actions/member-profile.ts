"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMember, clearMemberCookie } from "@/lib/auth/member-session";

const Schema = z.object({
  slug: z.string().min(1),
  name: z.string().min(2).max(80),
  email: z.union([z.email(), z.literal("")]).optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
});

export async function updateMemberProfileAction(formData: FormData) {
  const parsed = Schema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    email: formData.get("email"),
    address: formData.get("address"),
    neighborhood: formData.get("neighborhood"),
    city: formData.get("city"),
  });
  if (!parsed.success) return;

  const member = await requireMember(parsed.data.slug);
  const supabase = createAdminClient();
  await supabase
    .from("members")
    .update({
      name: parsed.data.name,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      neighborhood: parsed.data.neighborhood || null,
      city: parsed.data.city || null,
    } as never)
    .eq("id", member.id);

  revalidatePath(`/${parsed.data.slug}/app/me`);
}

export async function memberSignOutAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  await clearMemberCookie();
  redirect(`/${slug}`);
}
