-- ============================================================
-- Flag manual do operador: ia_disabled = true → IA NUNCA roda
-- nessa conversa. Usado pra contatos internos (equipe, líderes,
-- pessoas que o operador prefere atender pessoalmente).
--
-- Diferente de ia_active, que é estado temporário (pausa com timer).
-- ia_disabled é override permanente até o operador desfazer.
-- ============================================================

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS ia_disabled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_conv_ia_disabled
  ON public.whatsapp_conversations(workspace_id, ia_disabled)
  WHERE ia_disabled = true;
