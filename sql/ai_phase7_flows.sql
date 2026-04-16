-- Fase 7 — Flow Builder (fluxos automáticos)
-- Idempotente

CREATE TABLE IF NOT EXISTS public.ai_flows (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  trigger_type   TEXT NOT NULL
                 CHECK (trigger_type IN ('welcome', 'keyword', 'first_contact', 'member_updated', 'event_registered', 'manual')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  nodes          JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges          JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_flows_ws ON public.ai_flows(workspace_id, enabled);
CREATE INDEX IF NOT EXISTS idx_ai_flows_trigger ON public.ai_flows(workspace_id, trigger_type) WHERE enabled = TRUE;

ALTER TABLE public.ai_flows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_flows_all_own_workspace" ON public.ai_flows;
CREATE POLICY "ai_flows_all_own_workspace" ON public.ai_flows
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS trg_ai_flows_updated_at ON public.ai_flows;
CREATE TRIGGER trg_ai_flows_updated_at BEFORE UPDATE ON public.ai_flows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Execuções (audit + dedup para flows que rodam uma vez por membro)
CREATE TABLE IF NOT EXISTS public.ai_flow_executions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id        UUID NOT NULL REFERENCES public.ai_flows(id) ON DELETE CASCADE,
  workspace_id   UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  member_id      UUID,
  status         TEXT NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running', 'done', 'error')),
  error          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_flow_exec_flow ON public.ai_flow_executions(flow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_flow_exec_conv ON public.ai_flow_executions(conversation_id);
