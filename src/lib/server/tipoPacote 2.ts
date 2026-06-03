/**
 * Utilitários de normalização de tipo de pacote
 * Replicado de vtur-app/src/lib/tipoPacote.ts
 */

function normalizeText(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTipoPacoteForRule(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  let cleaned = raw;
  while (/\s*\([^()]*\)\s*$/.test(cleaned)) {
    cleaned = cleaned.replace(/\s*\([^()]*\)\s*$/, '').trim();
  }

  return cleaned || raw;
}

export function normalizeTipoPacoteRuleKey(value?: string | null): string {
  return normalizeText(cleanTipoPacoteForRule(value));
}
