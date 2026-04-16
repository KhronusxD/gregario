"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const EventSchema = z.object({
  title: z.string().min(3, { error: "Título muito curto" }).trim(),
  description: z.string().optional().or(z.literal("")),
  starts_at: z.string().min(1, { error: "Data obrigatória" }),
  ends_at: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(0).optional(),
  registration_open: z.coerce.boolean().optional(),
});

export type EventFormState =
  | { errors?: Record<string, string[]>; message?: string }
  | undefined;

export async function createEventAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const ctx = await requireRole(["admin", "secretaria"]);
  const parsed = EventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    location: formData.get("location"),
    capacity: formData.get("capacity") || undefined,
    registration_open: formData.get("registration_open") === "on",
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({
    workspace_id: ctx.workspace.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    starts_at: parsed.data.starts_at,
    ends_at: parsed.data.ends_at || null,
    location: parsed.data.location || null,
    capacity: parsed.data.capacity ?? null,
    registration_open: parsed.data.registration_open ?? true,
  });
  if (error) return { message: error.message };

  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}

export async function deleteEventAction(id: string, _fd?: FormData) {
  await requireRole(["admin", "secretaria"]);
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}
