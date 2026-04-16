"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/auth/member-session";

export async function registerForEventAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!slug || !eventId) return;

  const member = await requireMember(slug);
  const supabase = createAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, max_spots, spots_taken, workspace_id")
    .eq("id", eventId)
    .eq("workspace_id", member.workspace_id)
    .maybeSingle();

  const ev = event as {
    id: string;
    max_spots: number | null;
    spots_taken: number;
    workspace_id: string;
  } | null;
  if (!ev) return;
  if (ev.max_spots != null && ev.spots_taken >= ev.max_spots) return;

  const { error } = await supabase.from("event_registrations").insert({
    workspace_id: ev.workspace_id,
    event_id: ev.id,
    member_id: member.id,
    status: "confirmed",
  } as never);
  if (error) return;

  await supabase
    .from("events")
    .update({ spots_taken: ev.spots_taken + 1 } as never)
    .eq("id", ev.id);

  revalidatePath(`/${slug}/app/events`);
  revalidatePath(`/${slug}/app/events/${eventId}`);
}

export async function cancelRegistrationAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!slug || !eventId) return;

  const member = await requireMember(slug);
  const supabase = createAdminClient();

  await supabase
    .from("event_registrations")
    .update({ status: "cancelled" } as never)
    .eq("event_id", eventId)
    .eq("member_id", member.id);

  const { data: event } = await supabase
    .from("events")
    .select("spots_taken")
    .eq("id", eventId)
    .maybeSingle();
  const current = (event as { spots_taken: number } | null)?.spots_taken ?? 0;
  await supabase
    .from("events")
    .update({ spots_taken: Math.max(0, current - 1) } as never)
    .eq("id", eventId);

  revalidatePath(`/${slug}/app/events`);
  revalidatePath(`/${slug}/app/events/${eventId}`);
}
