"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";

export default function MemberLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  async function sendCode() {
    setLoading(true);
    setError(null);
    const digits = phone.replace(/\D/g, "");
    const res = await fetch("/api/auth/member/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits, workspaceSlug: slug }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Falha ao enviar código");
      return;
    }
    const data = (await res.json()) as { existingMember?: boolean };
    setIsNew(!data.existingMember);
    setStep("otp");
  }

  async function verifyCode() {
    setLoading(true);
    setError(null);
    const digits = phone.replace(/\D/g, "");
    const res = await fetch("/api/auth/member/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: digits,
        otp,
        workspaceSlug: slug,
        name: name.trim() || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Código inválido");
      return;
    }
    router.replace(`/${slug}/app`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <header className="mb-8">
        <p className="font-sans text-[11px] font-bold uppercase tracking-widest text-forest-green/60">
          Passo {step === "phone" ? "1" : step === "otp" ? "2" : "3"} de {isNew ? 3 : 2}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-forest-green">
          {step === "phone" ? "Qual é o seu WhatsApp?" : step === "otp" ? "Confirme o código" : "Como podemos te chamar?"}
        </h1>
      </header>

      <div className="space-y-4 rounded-lg bg-card p-6 shadow-card">
        {step === "phone" && (
          <>
            <input
              inputMode="tel"
              autoFocus
              placeholder="(11) 98888-7777"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-base text-forest-green"
            />
            <button
              onClick={sendCode}
              disabled={loading || phone.replace(/\D/g, "").length < 10}
              className="w-full rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-4 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <p className="font-sans text-sm text-forest-green/70">
              Enviamos um código de 6 dígitos para seu WhatsApp.
            </p>
            <input
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 text-center font-mono text-2xl tracking-widest text-forest-green"
            />
            <button
              onClick={() => (isNew ? setStep("name") : verifyCode())}
              disabled={loading || otp.length !== 6}
              className="w-full rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-4 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
            >
              {loading ? "Verificando..." : isNew ? "Continuar" : "Entrar"}
            </button>
            <button
              onClick={() => setStep("phone")}
              className="w-full font-sans text-xs font-bold text-forest-green/60"
            >
              Número errado?
            </button>
          </>
        )}

        {step === "name" && (
          <>
            <input
              autoFocus
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-sm border border-forest-green/10 bg-surface px-4 py-3 font-sans text-base text-forest-green"
            />
            <button
              onClick={verifyCode}
              disabled={loading || name.trim().length < 3}
              className="w-full rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-4 font-display text-sm font-bold text-card active:scale-95 disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </>
        )}

        {error ? (
          <p className="rounded-sm bg-red-50 px-3 py-2 font-sans text-sm text-red-700">{error}</p>
        ) : null}
      </div>
    </main>
  );
}
