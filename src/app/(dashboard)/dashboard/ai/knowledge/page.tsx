import { requireWorkspace } from "@/lib/auth/dal";
import { listKnowledgeFiles } from "@/lib/ai/knowledge";
import { KnowledgeUploader } from "@/components/ai/KnowledgeUploader";
import { KnowledgeRow } from "@/components/ai/KnowledgeRow";

export default async function AIKnowledgePage() {
  const ctx = await requireWorkspace();
  const files = await listKnowledgeFiles(ctx.workspace.id);

  return (
    <div className="space-y-6">
      <KnowledgeUploader />

      <div className="rounded-lg bg-card shadow-card">
        <div className="border-b border-forest-green/5 p-4">
          <p className="font-display text-sm font-bold text-forest-green">Arquivos enviados</p>
          <p className="mt-1 font-sans text-xs text-forest-green/60">
            Até 9.000 caracteres dos arquivos ativos são injetados no prompt da IA.
          </p>
        </div>
        {files.length === 0 ? (
          <p className="p-6 text-center font-sans text-sm text-forest-green/50">
            Nenhum arquivo enviado ainda.
          </p>
        ) : (
          <div>
            {files.map((f) => (
              <KnowledgeRow key={f.id} file={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
