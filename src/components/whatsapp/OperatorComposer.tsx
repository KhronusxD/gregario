"use client";

import { useActionState, useRef, useTransition } from "react";
import { sendOperatorMessageAction, type WhatsAppFormState } from "@/actions/whatsapp";

const INITIAL: WhatsAppFormState = { ok: true, message: null };

export function OperatorComposer({ conversationId }: { conversationId: string }) {
  const [state, formAction] = useActionState(sendOperatorMessageAction, INITIAL);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={(fd) => {
        start(async () => {
          await formAction(fd);
          ref.current?.reset();
        });
      }}
      className="flex gap-2 border-t border-forest-green/5 p-4"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <input
        name="body"
        autoComplete="off"
        placeholder="Responder como secretaria..."
        className="flex-1 rounded-full bg-forest-green/[0.04] px-4 py-2.5 font-sans text-sm text-forest-green outline-none focus:bg-forest-green/[0.08]"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-card transition-transform active:scale-95 disabled:opacity-50"
      >
        {pending ? "..." : "Enviar"}
      </button>
      {state.message ? (
        <span className={`self-center font-sans text-xs ${state.ok ? "text-action-green" : "text-red-500"}`}>
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
