-- Fase 5 — Multimodal: buckets de Storage
-- Idempotente

INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Policies: service_role já tem acesso total; usuários autenticados leem do próprio workspace
DROP POLICY IF EXISTS "whatsapp_media_read_public" ON storage.objects;
CREATE POLICY "whatsapp_media_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'whatsapp-media');
