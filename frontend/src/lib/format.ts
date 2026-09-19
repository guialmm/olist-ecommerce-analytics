export function formatMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export function formatCurrency(v: number): string {
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

export function humanize(text: string): string {
  return text.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Subtrai `months` meses de uma data ISO (YYYY-MM-DD), devolvendo outra data ISO. */
export function subMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}
