-- ============================================================
-- Avatar (foto de perfil) e nome do contato em whatsapp_conversations
-- - display_name: pushName do WhatsApp (já existe, mas nunca era populado)
-- - avatar_url:   URL da foto de perfil obtida via Evolution API
-- ============================================================

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS avatar_url        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_fetched_at TIMESTAMPTZ;
