import { normalizeText } from '$lib/normalizeText';

export function normalizeReceiptNumber(value?: string | null) {
  if (!value) return '';
  return normalizeText(value, { trim: true, collapseWhitespace: true })
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Normalização "loose" que remove zeros à esquerda do sufixo numérico
 * após um prefixo de 4 dígitos. Permite casar "5630-0000083861" com "83861".
 * Ex: "563000000083861" → "563083861" | "83861" → permanece "83861"
 */
export function normalizeReceiptNumberLoose(value?: string | null) {
  const normalized = normalizeReceiptNumber(value);
  const digits = normalized.replace(/\D/g, '');
  if (!digits) return normalized;
  if (digits.length > 4) {
    return `${digits.slice(0, 4)}${digits.slice(4).replace(/^0+/, '')}`;
  }
  return digits;
}

/**
 * Extrai o "core" do número: últimos 10 dígitos sem zeros à esquerda.
 * Permite casar "5630-0000083861" (core: "83861") com "83861" (core: "83861").
 */
export function receiptNumberCore(value?: string | null) {
  const digits = normalizeReceiptNumber(value).replace(/\D/g, '');
  if (!digits) return '';
  const core = digits.length >= 10 ? digits.slice(-10) : digits;
  return core.replace(/^0+/, '') || core;
}
