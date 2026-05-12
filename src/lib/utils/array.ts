export const SUPABASE_IN_BATCH_SIZE = 100;

export function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export function filterBatches<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  return values.length > size ? chunkArray(values, size) : [values];
}

export function dedupeById<T extends { id?: string | null }>(rows: T[]): T[] {
  const map = new Map<string, T>();
  rows.forEach((row) => {
    const id = String(row?.id || '').trim();
    if (id && !map.has(id)) map.set(id, row);
  });
  return Array.from(map.values());
}

export function uniqueValues<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

export function uniqueCleanStrings(values?: unknown[] | null): string[] {
  return uniqueValues((values || []).map((value) => String(value || '').trim()).filter(Boolean));
}
