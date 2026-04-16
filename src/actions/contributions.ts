"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const ContribSchema = z.object({
  member_id: z.string().uuid().optional().or(z.literal("")),
  category: z.enum(["dizimo", "oferta", "missoes", "construcao", "outros"]),
  amount: z.coerce.number().positive({ error: "Valor deve ser > 0" }),
  paid_at: z.string().min(1, { error: "Data obrigatória" }),
  method: z.enum(["pix", "dinheiro", "cartao", "transferencia"]),
  note: z.string().optional().or(z.literal("")),
});

export type ContribFormState =
  | { errors?: Record<string, string[]>; message?: string }
  | undefined;

export async function createContributionAction(
  _prev: ContribFormState,
  formData: FormData,
): Promise<ContribFormState> {
  const ctx = await requireRole(["admin", "tesoureiro"]);
  const parsed = ContribSchema.safeParse({
    member_id: formData.get("member_id"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    paid_at: formData.get("paid_at"),
    method: formData.get("method"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("contributions").insert({
    workspace_id: ctx.workspace.id,
    member_id: parsed.data.member_id || null,
    category: parsed.data.category,
    amount: parsed.data.amount,
    paid_at: parsed.data.paid_at,
    method: parsed.data.method,
    note: parsed.data.note || null,
  });
  if (error) return { message: error.message };

  revalidatePath("/dashboard/treasury");
  return { message: "Lançamento registrado." };
}

export async function deleteContributionAction(id: string, _fd?: FormData) {
  await requireRole(["admin", "tesoureiro"]);
  const supabase = await createClient();
  await supabase.from("contributions").delete().eq("id", id);
  revalidatePath("/dashboard/treasury");
  redirect("/dashboard/treasury");
}
