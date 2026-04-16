import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/whatsapp/evolution";

const Schema = z.object({
  phone: z.string().min(10),
  workspaceSlug: z.string().min(1),
});

function randomOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const { phone, workspaceSlug } = parsed.data;
  const admin = createAdminClient();

  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, evolution_instance")
    .eq("slug", workspaceSlug)
    .maybeSingle();

  if (!workspace) {
    return NextResponse.json({ error: "Igreja não encontrada" }, { status: 404 });
  }

  const otp = randomOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insErr } = await admin.from("otp_tokens").insert({
    workspace_id: workspace.id,
    phone,
    token: otp,
    expires_at: expiresAt,
  });
  if (insErr) {
    return NextResponse.json({ error: "Falha ao gerar código" }, { status: 500 });
  }

  try {
    if (workspace.evolution_instance) {
      await sendWhatsAppText({
        instanceName: workspace.evolution_instance,
        phone,
        text: `Seu código Gregário: *${otp}*\n\nVálido por 10 minutos.`,
      });
    }
  } catch {
    // best-effort — não revelar ao cliente se falhou o envio
  }

  const { data: existing } = await admin
    .from("members")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("phone", phone)
    .maybeSingle();

  return NextResponse.json({ success: true, existingMember: !!existing });
}
