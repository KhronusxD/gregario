-- ============================================================
-- Colunas que o código grava/lê em whatsapp_conversations mas
-- nunca foram criadas em nenhuma migration.
-- display_name: nome que o WhatsApp manda no pushName (fallback
--               de exibição quando o contato ainda não é membro)
-- last_preview: trecho da última mensagem (pra listagem rápida)
-- Idempotente.
-- ============================================================

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS last_preview TEXT;
