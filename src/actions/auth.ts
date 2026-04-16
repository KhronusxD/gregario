"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";

const SignInSchema = z.object({
  email: z.email({ error: "Email inválido" }).trim(),
  password: z.string().min(1, { error: "Informe a senha" }),
});

const SignUpSchema = z.object({
  churchName: z.string().min(3, { error: "Nome da igreja muito curto" }).trim(),
  denomination: z.string().trim().optional(),
  pastorName: z.string().min(3, { error: "Nome do pastor muito curto" }).trim(),
  email: z.email({ error: "Email inválido" }).trim(),
  password: z
    .string()
    .min(8, { error: "Senha deve ter no mínimo 8 caracteres" })
    .regex(/[a-zA-Z]/, { error: "Precisa de pelo menos uma letra" })
    .regex(/[0-9]/, { error: "Precisa de pelo menos um número" }),
});

export type AuthFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { message: "Email ou senha inválidos." };
  }

  redirect("/dashboard");
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = SignUpSchema.safeParse({
    churchName: formData.get("churchName"),
    denomination: formData.get("denomination"),
    pastorName: formData.get("pastorName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { churchName, denomination, pastorName, email, password } = parsed.data;
  const admin = createAdminClient();

  const baseSlug = slugify(churchName) || "igreja";
  const slug = await ensureUniqueSlug(admin, baseSlug);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { pastor_name: pastorName },
  });
  if (createErr || !created.user) {
    return { message: createErr?.message ?? "Não foi possível criar a conta." };
  }
  const userId = created.user.id;

  const { data: workspace, error: wsErr } = await admin
    .from("workspaces")
    .insert({
      name: churchName,
      slug,
      denomination: denomination ?? null,
      plan: "essencial",
      plan_status: "trial",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (wsErr || !workspace) {
    await admin.auth.admin.deleteUser(userId);
    return { message: wsErr?.message ?? "Falha ao criar workspace." };
  }

  const { error: wuErr } = await admin.from("workspace_users").insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: "admin",
  });
  if (wuErr) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("workspaces").delete().eq("id", workspace.id);
    return { message: wuErr.message };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

async function ensureUniqueSlug(
  admin: ReturnType<typeof createAdminClient>,
  base: string,
): Promise<string> {
  let candidate = base;
  let suffix = 1;
  while (true) {
    const { data } = await admin
      .from("workspaces")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
    if (suffix > 50) return `${base}-${Date.now()}`;
  }
}
