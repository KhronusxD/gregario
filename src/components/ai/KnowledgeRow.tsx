"use client";

import { useActionState, useTransition } from "react";
import { toggleKnowledgeFile, deleteKnowledgeFile, type KnowledgeFormState } from "@/actions/knowledge";
import type { KnowledgeFile } from "@/lib/ai/knowledge";

const INITIAL: KnowledgeFormState = { ok: true, message: null };

export function KnowledgeRow({ file }: { file: KnowledgeFile }) {
  const [, toggle] = useActionState(toggleKnowledgeFile, INITIAL);
  const [, remove] = useActionState(deleteKnowledgeFile, INITIAL);
  const [pending, start] = useTransition();

  const sizeKb = file.size_bytes ? `${(file.size_bytes / 1024).toFixed(1)} KB` : "";
  const date = new Date(file.created_at).toLocaleDateString("pt-BR");

  return (
    <div className="flex items-center justify-between border-b border-forest-green/5 p-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-forest-green">{file.filename}</p>
        <p className="font-sans text-xs text-forest-green/50">
          {sizeKb} · {date}
          {file.error ? ` · ⚠ ${file.error}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <form action={(fd) => start(() => toggle(fd))}>
          <input type="hidden" name="id" value={file.id} />
          <input type="hidden" name="enabled" value={String(!file.enabled)} />
          <button
            type="submit"
            disabled={pending}
            className={`rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest ${
              file.enabled
                ? "bg-action-green text-card"
                : "bg-forest-green/10 text-forest-green/60"
            } disabled:opacity-50`}
          >
            {file.enabled ? "Ativo" : "Inativo"}
          </button>
        </form>
        <form action={(fd) => start(() => remove(fd))}>
          <input type="hidden" name="id" value={file.id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-forest-green/10 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green/60 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
          >
            Remover
          </button>
        </form>
      </div>
    </div>
  );
}
