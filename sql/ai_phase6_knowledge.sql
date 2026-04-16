-- Fase 6 — Base de conhecimento
-- Idempotente

CREATE TABLE IF NOT EXISTS public.ai_knowledge_files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  filename       TEXT NOT NULL,
  mime_type      TEXT,
  size_bytes     INTEGER,
  storage_path   TEXT NOT NULL,
  extracted_text TEXT,
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  error          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_ws ON public.ai_knowledge_files(workspace_id, created_at DESC);

ALTER TABLE public.ai_knowledge_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_knowledge_all_own_workspace" ON public.ai_knowledge_files;
CREATE POLICY "ai_knowledge_all_own_workspace" ON public.ai_knowledge_files
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS trg_ai_knowledge_updated_at ON public.ai_knowledge_files;
CREATE TRIGGER trg_ai_knowledge_updated_at BEFORE UPDATE ON public.ai_knowledge_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bucket de Storage para knowledge-base
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false)
ON CONFLICT (id) DO NOTHING;
