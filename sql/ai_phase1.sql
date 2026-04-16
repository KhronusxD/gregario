-- Fase 1 da IA Agêntica — Fundação
-- Idempotente: pode rodar várias vezes

-- ============================================================
-- ai_settings — configuração por workspace
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id                   UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Personalidade
  assistant_name                 TEXT,
  show_assistant_name            BOOLEAN DEFAULT TRUE,
  system_prompt                  TEXT,
  tone                           TEXT DEFAULT 'acolhedor'
                                 CHECK (tone IN ('formal', 'profissional', 'acolhedor', 'amigavel', 'pastoral')),
  autonomy                       TEXT DEFAULT 'semi_autonomo'
                                 CHECK (autonomy IN ('supervisionado', 'semi_autonomo', 'autonomo')),

  -- Limites
  max_messages_per_conversation  INTEGER DEFAULT 25,
  escalate_if_no_reply_min       INTEGER DEFAULT 0,

  -- Horário (redundante com workspaces.attendance_start/end, mas mais granular)
  use_per_day_window             BOOLEAN DEFAULT FALSE,
  per_day_window                 JSONB,
  reply_outside_hours            BOOLEAN DEFAULT FALSE,

  -- Pausa/retorno humano
  pause_when_operator_replies    BOOLEAN DEFAULT TRUE,
  pause_when_human_on_mobile     BOOLEAN DEFAULT TRUE,
  resume_after_escalation_min    INTEGER,

  -- Listas
  negative_rules                 TEXT[] DEFAULT '{}',

  -- Grupos
  reply_in_groups                BOOLEAN DEFAULT FALSE,
  enabled_groups                 TEXT[] DEFAULT '{}',

  -- Novos contatos
  auto_enable_for_new_contacts   BOOLEAN DEFAULT TRUE,

  -- Debounce
  debounce_seconds               INTEGER DEFAULT 8
                                 CHECK (debounce_seconds BETWEEN 5 AND 30),

  -- Capacidades por plano (overrides)
  allow_audio_transcription      BOOLEAN DEFAULT TRUE,
  allow_image_analysis           BOOLEAN DEFAULT TRUE,

  created_at                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_settings_workspace ON public.ai_settings(workspace_id);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_settings_select_own_workspace" ON public.ai_settings;
CREATE POLICY "ai_settings_select_own_workspace" ON public.ai_settings
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "ai_settings_modify_own_workspace" ON public.ai_settings;
CREATE POLICY "ai_settings_modify_own_workspace" ON public.ai_settings
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- ai_message_queue — fila de debounce
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_message_queue (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id     UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  phone               TEXT NOT NULL,
  messages            TEXT[] NOT NULL DEFAULT '{}',
  process_after       TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'waiting'
                      CHECK (status IN ('waiting', 'processing', 'done', 'error')),
  attempts            INTEGER DEFAULT 0,
  last_error          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aiq_status_process ON public.ai_message_queue(status, process_after);

-- Unique: apenas UM entry 'waiting' por conversa (upsert acumula mensagens)
DROP INDEX IF EXISTS public.idx_aiq_conv_waiting;
CREATE UNIQUE INDEX idx_aiq_conv_waiting ON public.ai_message_queue(conversation_id) WHERE status = 'waiting';

ALTER TABLE public.ai_message_queue ENABLE ROW LEVEL SECURITY;
-- Sem policy pública — só service_role acessa

-- ============================================================
-- whatsapp_conversations — colunas extras pra IA
-- ============================================================
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS ia_resume_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ia_last_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ia_summary        TEXT,
  ADD COLUMN IF NOT EXISTS handoff_reason    TEXT,
  ADD COLUMN IF NOT EXISTS handoff_at        TIMESTAMPTZ;

-- ============================================================
-- whatsapp_messages — colunas pra multimodal + echo detection
-- ============================================================
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_url         TEXT,
  ADD COLUMN IF NOT EXISTS media_type        TEXT,
  ADD COLUMN IF NOT EXISTS transcription     TEXT,
  ADD COLUMN IF NOT EXISTS ai_analysis       TEXT,
  ADD COLUMN IF NOT EXISTS ai_extracted      JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS processed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_error  TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_msg_id   TEXT,
  ADD COLUMN IF NOT EXISTS sent_by           TEXT
                           CHECK (sent_by IN ('member', 'human', 'ia', 'system'));

-- Backfill sent_by a partir de from_me/sender
UPDATE public.whatsapp_messages
SET sent_by = CASE
  WHEN from_me = FALSE THEN 'member'
  WHEN ai_handled = TRUE THEN 'ia'
  ELSE 'human'
END
WHERE sent_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_msgs_conv_created ON public.whatsapp_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msgs_conv_from_me ON public.whatsapp_messages(conversation_id, from_me, created_at DESC);

-- ============================================================
-- usage_logs — rastreio de custo multimodal
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action         TEXT NOT NULL,
  conversation_id UUID,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_ws_created ON public.ai_usage_logs(workspace_id, created_at DESC);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
-- Sem policy — service_role apenas

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_settings_updated_at ON public.ai_settings;
CREATE TRIGGER trg_ai_settings_updated_at BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_queue_updated_at ON public.ai_message_queue;
CREATE TRIGGER trg_ai_queue_updated_at BEFORE UPDATE ON public.ai_message_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Seed default ai_settings para workspaces existentes
-- ============================================================
INSERT INTO public.ai_settings (workspace_id, system_prompt, assistant_name)
SELECT id,
       'Você é a assistente virtual da igreja ' || name || '. Responda com acolhimento pastoral, brevidade e clareza. Nunca prometa bênçãos, milagres ou curas. Nunca substitua aconselhamento pastoral em temas delicados — escalone para um pastor humano.',
       'Assistente'
FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;
