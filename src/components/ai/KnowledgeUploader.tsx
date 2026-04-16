"use client";

import { useActionState, useRef, useTransition } from "react";
import { uploadKnowledgeFile, type KnowledgeFormState } from "@/actions/knowledge";

const INITIAL: KnowledgeFormState = { ok: true, message: null };

export function KnowledgeUploader() {
  const [state, action] = useActionState(uploadKnowledgeFile, INITIAL);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => start(async () => { await action(fd); formRef.current?.reset(); })}
      className="rounded-lg bg-card p-6 shadow-card"
    >
      <p className="font-display text-sm font-bold text-forest-green">Enviar arquivo</p>
      <p className="mt-1 font-sans text-xs text-forest-green/60">
        Formatos aceitos: .txt, .md, .csv — máx 2MB. A IA usará o conteúdo ativado como contexto.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
          required
          className="flex-1 rounded-full bg-forest-green/[0.04] px-4 py-2.5 font-sans text-sm text-forest-green file:mr-3 file:rounded-full file:border-0 file:bg-forest-green/10 file:px-3 file:py-1 file:font-display file:text-xs file:font-bold file:uppercase file:text-forest-green"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-card transition-transform active:scale-95 disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Enviar"}
        </button>
      </div>
      {state.message ? (
        <p className={`mt-3 font-sans text-xs ${state.ok ? "text-action-green" : "text-red-500"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
