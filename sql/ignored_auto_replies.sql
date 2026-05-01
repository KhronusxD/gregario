-- ============================================================
-- Mensagens automáticas do WhatsApp Business a ignorar.
-- Sem isso, a saudação automática ("Olá, recebemos sua mensagem…")
-- chega no webhook como fromMe=true e o sistema interpreta como
-- "humano respondeu pelo celular", pausando a IA.
--
-- Strings exatas (case-insensitive, normalizadas), uma por linha
-- na UI. Match: igualdade ou starts-with após normalização.
-- ============================================================

ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS ignored_auto_replies TEXT[] NOT NULL DEFAULT '{}'::TEXT[];
