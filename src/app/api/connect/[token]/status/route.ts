import { NextResponse } from "next/server";
import { verifyConnectToken } from "@/lib/whatsapp/connect-token";
import { getInstanceQr, getInstanceStatus } from "@/lib/whatsapp/evolution";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const payload = verifyConnectToken(token);
  if (!payload) {
    return NextResponse.json(
      { ok: false, state: "expired", number: null, qr: null },
      { status: 200 },
    );
  }

  const status = await getInstanceStatus(payload.i).catch(() => ({
    state: "unknown" as const,
    number: undefined,
  }));

  // Só busca QR enquanto não está conectado
  let qr: { base64: string | null; pairingCode: string | null } | null = null;
  if (status.state !== "open") {
    try {
      const r = await getInstanceQr(payload.i);
      qr = { base64: r.base64 ?? null, pairingCode: r.pairingCode ?? r.code ?? null };
    } catch {
      qr = null;
    }
  }

  return NextResponse.json({
    ok: true,
    state: status.state,
    number: status.number ?? null,
    qr,
  });
}
