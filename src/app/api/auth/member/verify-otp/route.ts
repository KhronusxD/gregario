import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { setMemberCookie } from "@/lib/auth/member-session";

const Schema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6),
  workspaceSlug: z.string().min(1),
  name: z.string().optional(),
  birthDate: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const { phone, otp, workspaceSlug, name, birthDate } = parsed.data;
  const admin = createAdminClient();

  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, slug")
    .eq("slug", workspaceSlug)
    .maybeSingle();
  if (!workspace) {
    return NextResponse.json({ error: "Igreja não encontrada" }, { status: 404 });
  }

  const { data: token } = await admin
    .from("otp_tokens")
    .select("id, expires_at")
    .eq("workspace_id", workspace.id)
    .eq("phone", phone)
    .eq("token", otp)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!token || new Date(token.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Código inválido ou expirado" },
      { status: 400 },
    );
  }

  await admin.from("otp_tokens").update({ used: true }).eq("id", token.id);

  const { data: existing } = await admin
    .from("members")
    .select("id, member_user_id")
    .eq("workspace_id", workspace.id)
    .eq("phone", phone)
    .maybeSingle();

  let memberId = existing?.id;
  let authUserId = existing?.member_user_id;

  if (!authUserId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      user_metadata: { channel: "member_app", workspace_id: workspace.id },
    });
    if (createErr || !created.user) {
      return NextResponse.json(
        { error: "Falha ao criar usuário" },
        { status: 500 },
      );
    }
    authUserId = created.user.id;
  }

  if (!memberId) {
    const { data: newMember, error: mErr } = await admin
      .from("members")
      .insert({
        workspace_id: workspace.id,
        name: name ?? "Visitante",
        phone,
        birth_date: birthDate ?? null,
        status: "visitante",
        member_user_id: authUserId,
        app_enabled: true,
      })
      .select("id")
      .single();
    if (mErr || !newMember) {
      return NextResponse.json(
        { error: "Falha ao criar cadastro" },
        { status: 500 },
      );
    }
    memberId = newMember.id;
  } else {
    await admin
      .from("members")
      .update({ member_user_id: authUserId, app_enabled: true })
      .eq("id", memberId);
  }

  await setMemberCookie({
    memberId: memberId!,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
  });

  return NextResponse.json({ success: true, memberId });
}
