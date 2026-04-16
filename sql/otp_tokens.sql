-- OTP tokens para autenticação WhatsApp dos membros no PWA.
-- Não está em 03-DATABASE.md; aplicar manualmente no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS otp_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  phone         text NOT NULL,
  token         text NOT NULL,
  used          boolean DEFAULT false,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_workspace_phone
  ON otp_tokens(workspace_id, phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_lookup
  ON otp_tokens(workspace_id, phone, token)
  WHERE used = false;

-- Limpeza periódica (opcional): DELETE FROM otp_tokens WHERE expires_at < now() - interval '1 day';

ALTER TABLE otp_tokens ENABLE ROW LEVEL SECURITY;
-- Service-role bypass. Nenhuma policy para anon/authenticated.
