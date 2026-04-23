-- Backfill: todo workspace com instância Evolution já configurada
-- é considerado "whatsapp_active" (senão o webhook descarta as mensagens
-- inbound antes de gravar e a aba /dashboard/whatsapp fica vazia).
-- Idempotente.

UPDATE public.workspaces
   SET whatsapp_active = TRUE
 WHERE evolution_instance IS NOT NULL
   AND whatsapp_active IS DISTINCT FROM TRUE;
