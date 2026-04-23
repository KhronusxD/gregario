-- ============================================================
-- RLS policies pras tabelas whatsapp_* — sem isso, a aba
-- /dashboard/whatsapp retorna 0 linhas mesmo com dados no banco,
-- porque o cliente user-scoped respeita RLS mas não tem policy
-- que libere SELECT.
-- Idempotente.
-- ============================================================

-- Função helper (cria se não existir). SECURITY DEFINER pra não
-- cair em RLS recursivo.
CREATE OR REPLACE FUNCTION public.has_workspace_access(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- whatsapp_conversations
-- ------------------------------------------------------------
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_conversations_all_own_workspace"
  ON public.whatsapp_conversations;
CREATE POLICY "whatsapp_conversations_all_own_workspace"
  ON public.whatsapp_conversations
  FOR ALL
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- ------------------------------------------------------------
-- whatsapp_messages
-- ------------------------------------------------------------
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_messages_all_own_workspace"
  ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_all_own_workspace"
  ON public.whatsapp_messages
  FOR ALL
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- ------------------------------------------------------------
-- whatsapp_faq (reforça, mesmo que o schema_alignment.sql já tenha
-- criado a policy — idempotente)
-- ------------------------------------------------------------
ALTER TABLE public.whatsapp_faq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_faq_all_own_workspace"
  ON public.whatsapp_faq;
CREATE POLICY "whatsapp_faq_all_own_workspace"
  ON public.whatsapp_faq
  FOR ALL
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));
