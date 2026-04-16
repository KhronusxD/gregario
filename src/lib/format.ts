export function formatBRL(cents: number | string | null | undefined): string {
  const n = Number(cents ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateBR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function startOfMonthISO(d: Date = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export function endOfMonthISO(d: Date = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
}
