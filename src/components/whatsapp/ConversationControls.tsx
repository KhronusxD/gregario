"use client";

import { useActionState, useTransition } from "react";
import {
  releaseToAIAction,
  takeoverConversationAction,
  toggleInternalContactAction,
  type WhatsAppFormState,
} from "@/actions/whatsapp";

const INITIAL: WhatsAppFormState = { ok: true, message: null };

type Props = {
  conversationId: string;
  status: string;
  iaDisabled: boolean;
};

export function ConversationControls({ conversationId, status, iaDisabled }: Props) {
  const [takeoverState, takeover] = useActionState(takeoverConversationAction, INITIAL);
  const [releaseState, release] = useActionState(releaseToAIAction, INITIAL);
  const [internalState, toggleInternal] = useActionState(toggleInternalContactAction, INITIAL);
  const [pending, start] = useTransition();

  const isHuman = status === "human";
  const currentState = iaDisabled ? internalState : isHuman ? releaseState : takeoverState;

  return (
    <div className="flex items-center gap-2">
      {/* Toggle "Contato interno" — sempre visível */}
      <form action={(fd) => start(() => toggleInternal(fd))}>
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="next" value={iaDisabled ? "false" : "true"} />
        <button
          type="submit"
          disabled={pending}
          title={
            iaDisabled
              ? "Reativar IA para esse contato"
              : "Marcar como contato interno (IA nunca responde)"
          }
          className={`flex items-center gap-1 rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest transition-all ${
            iaDisabled
              ? "bg-forest-green text-card hover:opacity-90"
              : "bg-forest-green/[0.06] text-forest-green/60 hover:bg-forest-green/10 hover:text-forest-green"
          } disabled:opacity-50`}
        >
          {iaDisabled && (
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          Interno
        </button>
      </form>

      {/* Assumir / Devolver — só se não for interno (não faz sentido assumir/devolver
          algo que a IA já está permanentemente fora). */}
      {!iaDisabled && (
        <form action={(fd) => start(() => (isHuman ? release(fd) : takeover(fd)))}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <button
            type="submit"
            disabled={pending}
            className={`rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest transition-all ${
              isHuman
                ? "bg-action-green text-card hover:opacity-90"
                : "bg-forest-green/10 text-forest-green hover:bg-forest-green/15"
            } disabled:opacity-50`}
          >
            {pending ? "..." : isHuman ? "Devolver para IA" : "Assumir conversa"}
          </button>
        </form>
      )}

      {currentState.message ? (
        <span
          className={`font-sans text-[10px] ${currentState.ok ? "text-action-green" : "text-red-500"}`}
        >
          {currentState.message}
        </span>
      ) : null}
    </div>
  );
}
