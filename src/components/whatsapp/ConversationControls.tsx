"use client";

import { useActionState, useTransition } from "react";
import { releaseToAIAction, takeoverConversationAction, type WhatsAppFormState } from "@/actions/whatsapp";

const INITIAL: WhatsAppFormState = { ok: true, message: null };

export function ConversationControls({ conversationId, status }: { conversationId: string; status: string }) {
  const [takeoverState, takeover] = useActionState(takeoverConversationAction, INITIAL);
  const [releaseState, release] = useActionState(releaseToAIAction, INITIAL);
  const [pending, start] = useTransition();

  const isHuman = status === "human";
  const currentState = isHuman ? releaseState : takeoverState;
  const action = isHuman ? release : takeover;
  const label = isHuman ? "Devolver para IA" : "Assumir conversa";

  return (
    <form action={(fd) => start(() => action(fd))} className="flex items-center gap-2">
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
        {pending ? "..." : label}
      </button>
      {currentState.message ? (
        <span className={`font-sans text-[10px] ${currentState.ok ? "text-action-green" : "text-red-500"}`}>
          {currentState.message}
        </span>
      ) : null}
    </form>
  );
}
