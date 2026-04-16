/**
 * Placeholder Database type. Substituir por geração automática
 * via `supabase gen types typescript --project-id <id>` quando possível.
 */
export type Database = {
  // intentionally loose: tabelas + colunas tipadas como any até gerarmos
  // os tipos a partir do schema.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [schema: string]: any;
};
