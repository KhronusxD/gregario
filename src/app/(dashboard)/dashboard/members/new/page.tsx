import { PageHeader } from "@/components/admin/PageHeader";
import { MemberForm } from "@/components/admin/MemberForm";
import { createMemberAction } from "@/actions/members";

export default function NewMemberPage() {
  return (
    <main className="ml-64 max-w-3xl p-10">
      <PageHeader
        eyebrow="Secretaria"
        title="Novo membro"
        description="Cadastro manual — para importar em massa use a ferramenta de CSV."
      />
      <MemberForm action={createMemberAction} submitLabel="Cadastrar" />
    </main>
  );
}
