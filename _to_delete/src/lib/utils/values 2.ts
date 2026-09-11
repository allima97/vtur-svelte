export function toCleanString(value: unknown): string {
  return String(value || '').trim();
}

export function toFiniteNumber(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
