"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { saveAISettings, type AIConfigFormState } from "@/actions/ai";
import type { AISettings } from "@/lib/ai/settings";

const INITIAL: AIConfigFormState = { ok: true, message: null };

const TONE_OPTIONS: Array<{ value: AISettings["tone"]; label: string }> = [
  { value: "acolhedor", label: "Acolhedor" },
  { value: "pastoral", label: "Pastoral" },
  { value: "profissional", label: "Profissional" },
  { value: "amigavel", label: "Amigável" },
  { value: "formal", label: "Formal" },
];

const AUTONOMY_OPTIONS: Array<{ value: AISettings["autonomy"]; label: string; hint: string }> = [
  { value: "supervisionado", label: "Supervisionado", hint: "Quase tudo vai pra humano. Seguro." },
  { value: "semi_autonomo", label: "Semi-autônomo", hint: "IA resolve o básico, transfere o delicado. Recomendado." },
  { value: "autonomo", label: "Autônomo", hint: "IA toma iniciativa. Exige supervisão." },
];

export function AIConfigForm({ settings }: { settings: AISettings }) {
  const [state, formAction] = useActionState(saveAISettings, INITIAL);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => start(() => formAction(fd))}
      className="grid gap-6 md:grid-cols-2"
    >
      {/* Coluna 1 */}
      <div className="space-y-6">
        <Section title="Identidade">
          <Field label="Nome da IA (opcional)" hint="Ex: Sofia, Estêvão. Deixe vazio para usar 'Assistente'.">
            <input
              name="assistant_name"
              defaultValue={settings.assistant_name ?? ""}
              placeholder="Sofia"
              className="input"
            />
          </Field>
          <Toggle name="show_assistant_name" label="Mostrar nome antes das mensagens" defaultChecked={settings.show_assistant_name} />
        </Section>

        <Section title="Personalidade">
          <Field label="Tom da comunicação">
            <select name="tone" defaultValue={settings.tone} className="input">
              {TONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Autonomia">
            <select name="autonomy" defaultValue={settings.autonomy} className="input">
              {AUTONOMY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.hint}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Contexto da igreja">
          <Field
            label="Prompt de contexto"
            hint="Descreva brevemente a igreja, denominação, linha teológica, o que a IA deve saber. Injetado direto no cérebro da IA."
          >
            <textarea
              name="system_prompt"
              defaultValue={settings.system_prompt ?? ""}
              rows={14}
              maxLength={20000}
              placeholder="Somos a Igreja Batista Central, linha pentecostal tradicional. Priorizamos o cuidado com novos convertidos e o trabalho com adolescentes..."
              className="input"
            />
          </Field>
        </Section>

        <Section title="Regras absolutas (anti-lista)">
          <Field
            label="Uma regra por linha"
            hint="Ex: Nunca fale sobre política. Nunca sugira outra igreja. Não discuta valores de dízimo."
          >
            <textarea
              name="negative_rules"
              defaultValue={(settings.negative_rules ?? []).join("\n")}
              rows={5}
              className="input"
            />
          </Field>
        </Section>
      </div>

      {/* Coluna 2 */}
      <div className="space-y-6">
        <Section title="Limites de conversa">
          <Field label="Máx. mensagens da IA por conversa" hint="Depois disso, transfere pra humano. 0 = sem limite.">
            <input
              name="max_messages_per_conversation"
              type="number"
              min={0}
              max={500}
              defaultValue={settings.max_messages_per_conversation}
              className="input"
            />
          </Field>
          <Field label="Debounce (segundos)" hint="Espera antes de responder, pra agrupar mensagens rápidas. Entre 5 e 30.">
            <input
              name="debounce_seconds"
              type="number"
              min={5}
              max={30}
              defaultValue={settings.debounce_seconds}
              className="input"
            />
          </Field>
        </Section>

        <Section title="Comportamento com humanos">
          <Toggle
            name="pause_when_operator_replies"
            label="Pausar IA quando a secretaria responder pelo painel"
            defaultChecked={settings.pause_when_operator_replies}
          />
          <Toggle
            name="pause_when_human_on_mobile"
            label="Pausar IA quando um humano responder pelo celular"
            defaultChecked={settings.pause_when_human_on_mobile}
          />
          <Field label="Retornar IA após X minutos (vazio = nunca)" hint="Útil pra pastor intervir e depois a IA reassumir.">
            <input
              name="resume_after_escalation_min"
              type="number"
              min={0}
              max={1440}
              defaultValue={settings.resume_after_escalation_min ?? ""}
              placeholder="ex: 60"
              className="input"
            />
          </Field>
        </Section>

        <Section title="Novos contatos">
          <Toggle
            name="auto_enable_for_new_contacts"
            label="Ativar IA automaticamente para quem escrever pela primeira vez"
            defaultChecked={settings.auto_enable_for_new_contacts}
          />
        </Section>

        <Section title="Horário de atendimento">
          <Toggle
            name="reply_outside_hours"
            label="IA responde APENAS fora do horário comercial"
            defaultChecked={settings.reply_outside_hours}
          />
          <p className="font-sans text-xs text-forest-green/50">
            O horário é o que está em <Link href="/dashboard/settings" className="underline">Configurações da igreja</Link>.
          </p>
        </Section>

        <Section title="Escalação por silêncio">
          <Field label="Transferir se o membro não responder em X min (0 = desligado)">
            <input
              name="escalate_if_no_reply_min"
              type="number"
              min={0}
              max={1440}
              defaultValue={settings.escalate_if_no_reply_min}
              className="input"
            />
          </Field>
        </Section>
      </div>

      {/* Footer */}
      <div className="col-span-full flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-6 py-3 font-display text-sm font-bold text-card disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar configurações"}
        </button>
        {state.message ? (
          <span className={`font-sans text-sm ${state.ok ? "text-action-green" : "text-red-500"}`}>{state.message}</span>
        ) : null}
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 6px;
          background: color-mix(in srgb, var(--color-forest-green) 4%, white);
          padding: 10px 14px;
          font-family: var(--font-sans, inherit);
          font-size: 14px;
          color: var(--color-forest-green, #0d2b1f);
          border: 1px solid transparent;
          outline: none;
        }
        .input:focus { border-color: color-mix(in srgb, var(--color-forest-green) 30%, transparent); }
        textarea.input { resize: vertical; min-height: 90px; }
      `}</style>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-card p-6 shadow-card">
      <h3 className="mb-4 font-display text-base font-bold text-forest-green">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-display text-xs font-bold uppercase tracking-widest text-forest-green/70">{label}</span>
      {children}
      {hint ? <span className="mt-1 block font-sans text-xs text-forest-green/50">{hint}</span> : null}
    </label>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-action-green" />
      <span className="font-sans text-sm text-forest-green">{label}</span>
    </label>
  );
}
