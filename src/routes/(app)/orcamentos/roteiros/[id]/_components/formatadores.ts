export const PT_BR_DECIMAL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatBRL(value: number | null | undefined): string {
  if (value == null) return '';
  return PT_BR_DECIMAL_FORMATTER.format(value);
}
