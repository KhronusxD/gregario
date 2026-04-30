"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { sendOperatorMessageAction, type WhatsAppFormState } from "@/actions/whatsapp";

const INITIAL: WhatsAppFormState = { ok: true, message: null };
const MAX_HEIGHT_PX = 200;

export function OperatorComposer({ conversationId }: { conversationId: string }) {
  const [state, formAction] = useActionState(sendOperatorMessageAction, INITIAL);
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize do textarea conforme conteúdo, com cap.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [body]);

  // Reseta a área quando troca de conversa.
  useEffect(() => {
    setBody("");
  }, [conversationId]);

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed || pending) return;
    setBody(""); // limpa imediatamente — feedback instantâneo
    const fd = new FormData();
    fd.set("conversationId", conversationId);
    fd.set("body", trimmed);
    start(() => formAction(fd));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t border-forest-green/5 p-3"
    >
      <textarea
        ref={textareaRef}
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        autoComplete="off"
        placeholder="Responder como secretaria…  (Enter envia · Shift+Enter quebra linha)"
        className="flex-1 resize-none rounded-2xl bg-forest-green/[0.04] px-4 py-2.5 font-sans text-sm leading-snug text-forest-green outline-none focus:bg-forest-green/[0.08]"
      />
      <button
        type="submit"
        disabled={pending || !body.trim()}
        className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-card transition-transform active:scale-95 disabled:opacity-50"
      >
        {pending ? "..." : "Enviar"}
      </button>
      {state.message && !state.ok ? (
        <span className="self-center font-sans text-xs text-red-500">{state.message}</span>
      ) : null}
    </form>
  );
}
