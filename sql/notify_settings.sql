-- ============================================================
-- Notificações de urgência / handoff
-- Colunas em ai_settings pra workspace receber alertas via WhatsApp
-- quando a IA precisar de intervenção humana.
-- notify_phone armazenado como dígitos puros com prefixo 55 (E.164 sem +).
-- ============================================================

ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS notify_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_phone  TEXT;
