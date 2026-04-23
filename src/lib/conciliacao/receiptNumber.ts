import { normalizeText } from '$lib/normalizeText';

export function normalizeReceiptNumber(value?: string | null) {
  if (!value) return '';
  return normalizeText(value, { trim: true, collapseWhitespace: true })
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
