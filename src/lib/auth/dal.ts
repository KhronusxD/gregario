import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceRole =
  | "admin"
  | "secretaria"
  | "tesoureiro"
  | "lider"
  | "visualizador";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireUser = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
});

export const getWorkspaceContext = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_users")
    .select(
      "role, workspaces!inner(id, slug, name, denomination, logo_url, plan, trial_ends_at, plan_status)",
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const workspace = Array.isArray(data.workspaces)
    ? data.workspaces[0]
    : data.workspaces;

  return {
    user,
    workspace,
    role: data.role as WorkspaceRole,
  };
});

export async function requireWorkspace() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireRole(allowed: WorkspaceRole[]) {
  const ctx = await requireWorkspace();
  if (!allowed.includes(ctx.role)) redirect("/dashboard");
  return ctx;
}
