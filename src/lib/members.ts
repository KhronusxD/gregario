export const MEMBER_STATUS = {
  visitante: { label: "Visitante", tone: "bg-accent-green/20 text-forest-green" },
  em_processo: { label: "Em processo", tone: "bg-action-green/15 text-forest-green" },
  membro_ativo: { label: "Membro ativo", tone: "bg-forest-green text-card" },
  membro_inativo: { label: "Inativo", tone: "bg-forest-green/10 text-forest-green/60" },
} as const;

export type MemberStatus = keyof typeof MEMBER_STATUS;

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}
