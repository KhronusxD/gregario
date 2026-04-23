-- ============================================================
-- Schema alignment — alinha DB com o código.
-- Idempotente. Pode rodar várias vezes no SQL editor.
-- ============================================================

-- ------------------------------------------------------------
-- whatsapp_conversations.ia_active
-- Código (webhooks/evolution, webhooks/meta, cron/ai-queue)
-- lê esta coluna; base schema prevê mas nenhuma migration criava.
-- ------------------------------------------------------------
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS ia_active BOOLEAN DEFAULT TRUE;

UPDATE public.whatsapp_conversations
   SET ia_active = CASE WHEN status = 'human' THEN FALSE ELSE TRUE END
 WHERE ia_active IS NULL;

-- ------------------------------------------------------------
-- whatsapp_faq — tabela referenciada pelo código (handler FAQ,
-- onboarding step, contexto da IA) mas não criada em lugar nenhum.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_faq (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  question     TEXT NOT NULL,
  answer       TEXT NOT NULL,
  category     TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_faq_workspace
  ON public.whatsapp_faq(workspace_id, active);

ALTER TABLE public.whatsapp_faq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_faq_all_own_workspace" ON public.whatsapp_faq;
CREATE POLICY "whatsapp_faq_all_own_workspace" ON public.whatsapp_faq
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()
    )
  );

-- Trigger de updated_at (a função set_updated_at() já existe do ai_phase1)
DROP TRIGGER IF EXISTS trg_whatsapp_faq_updated_at ON public.whatsapp_faq;
CREATE TRIGGER trg_whatsapp_faq_updated_at
  BEFORE UPDATE ON public.whatsapp_faq
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
