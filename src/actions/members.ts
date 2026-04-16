"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const MemberSchema = z.object({
  name: z.string().min(2, { error: "Nome obrigatório" }).trim(),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /.+@.+\..+/.test(v), { error: "Email inválido" }),
  birth_date: z.string().optional().or(z.literal("")),
  status: z.enum(["visitante", "em_processo", "membro_ativo", "membro_inativo"]),
  gender: z.enum(["M", "F", ""]).optional(),
  address: z.string().optional().or(z.literal("")),
  baptism_date: z.string().optional().or(z.literal("")),
  joined_at: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type MemberFormState =
  | { errors?: Record<string, string[]>; message?: string }
  | undefined;

function normalize(formData: FormData) {
  return {
    name: (formData.get("name") ?? "") as string,
    phone: (formData.get("phone") ?? "") as string,
    email: (formData.get("email") ?? "") as string,
    birth_date: (formData.get("birth_date") ?? "") as string,
    status: (formData.get("status") ?? "visitante") as string,
    gender: (formData.get("gender") ?? "") as string,
    address: (formData.get("address") ?? "") as string,
    baptism_date: (formData.get("baptism_date") ?? "") as string,
    joined_at: (formData.get("joined_at") ?? "") as string,
    notes: (formData.get("notes") ?? "") as string,
  };
}

function emptyToNull<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out;
}

export async function createMemberAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const ctx = await requireWorkspace();
  const parsed = MemberSchema.safeParse(normalize(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const supabase = await createClient();
  const payload = emptyToNull({ ...parsed.data, workspace_id: ctx.workspace.id });
  const { error } = await supabase.from("members").insert(payload);
  if (error) return { message: error.message };

  revalidatePath("/dashboard/members");
  redirect("/dashboard/members");
}

export async function updateMemberAction(
  memberId: string,
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireWorkspace();
  const parsed = MemberSchema.safeParse(normalize(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update(emptyToNull(parsed.data))
    .eq("id", memberId);
  if (error) return { message: error.message };

  revalidatePath(`/dashboard/members/${memberId}`);
  revalidatePath("/dashboard/members");
  return { message: "Salvo" };
}

export async function deleteMemberAction(memberId: string, _fd?: FormData) {
  await requireWorkspace();
  const supabase = await createClient();
  await supabase.from("members").delete().eq("id", memberId);
  revalidatePath("/dashboard/members");
  redirect("/dashboard/members");
}
