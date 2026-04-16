"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const GroupSchema = z.object({
  name: z.string().min(2).trim(),
  description: z.string().optional().or(z.literal("")),
  meeting_day: z.string().optional().or(z.literal("")),
  meeting_time: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

export type GroupFormState =
  | { errors?: Record<string, string[]>; message?: string }
  | undefined;

export async function createGroupAction(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const ctx = await requireRole(["admin", "secretaria"]);
  const parsed = GroupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    meeting_day: formData.get("meeting_day"),
    meeting_time: formData.get("meeting_time"),
    address: formData.get("address"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.from("groups").insert({
    workspace_id: ctx.workspace.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    meeting_day: parsed.data.meeting_day || null,
    meeting_time: parsed.data.meeting_time || null,
    address: parsed.data.address || null,
  });
  if (error) return { message: error.message };

  revalidatePath("/dashboard/groups");
  redirect("/dashboard/groups");
}
