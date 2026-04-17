-- ============================================================
-- Workspaces: campos do onboarding
-- ============================================================
-- Rodar no SQL editor do Supabase. Idempotente.

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS service_schedule       text,
  ADD COLUMN IF NOT EXISTS pastor_phone           text,
  ADD COLUMN IF NOT EXISTS onboarding_step        integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Garante que workspaces já criados antes do campo fiquem no step 1
UPDATE public.workspaces
   SET onboarding_step = 1
 WHERE onboarding_step IS NULL;

-- ------------------------------------------------------------
-- RLS: admin do workspace precisa poder atualizar a própria igreja
-- ------------------------------------------------------------
-- (idempotente — recria a policy se já existir)
DROP POLICY IF EXISTS "workspace_admin_update" ON public.workspaces;
CREATE POLICY "workspace_admin_update"
  ON public.workspaces
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_users wu
      WHERE wu.workspace_id = workspaces.id
        AND wu.user_id = auth.uid()
        AND wu.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_users wu
      WHERE wu.workspace_id = workspaces.id
        AND wu.user_id = auth.uid()
        AND wu.role = 'admin'
    )
  );
