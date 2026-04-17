import { notFound } from "next/navigation";
import { verifyConnectToken } from "@/lib/whatsapp/connect-token";
import { ConnectClient } from "./ConnectClient";

type Props = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export default async function ConnectPage({ params }: Props) {
  const { token } = await params;
  const payload = verifyConnectToken(token);
  if (!payload) notFound();
  const expiresAt = new Date(payload.exp * 1000).toLocaleString("pt-BR");

  return (
    <main className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto max-w-md rounded-lg bg-card p-6 shadow-card">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-forest-green/50">
          Conectar WhatsApp
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-forest-green">
          Escaneie o QR abaixo
        </h1>
        <p className="mt-2 font-sans text-sm text-forest-green/70">
          Abra o WhatsApp no celular que vai ficar conectado → <strong>Aparelhos conectados</strong> →{" "}
          <strong>Conectar um aparelho</strong> e aponte para o QR.
        </p>
        <p className="mt-2 font-sans text-xs text-forest-green/50">Link válido até {expiresAt}.</p>
        <div className="mt-6">
          <ConnectClient token={token} />
        </div>
      </div>
    </main>
  );
}
