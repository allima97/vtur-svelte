/**
 * Formatadores utilitários — VTUR
 *
 * Uso:
 * ```ts
 * import { formatCurrency, formatDate, formatPhone } from '$lib/utils/formatters';
 * ```
 */

// ─── Moeda ────────────────────────────────────────────────────────────────────

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatCurrencyShort(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-';
  if (Math.abs(value) >= 1_000_000)
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (Math.abs(value) >= 1_000)
    return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`;
  return formatCurrency(value);
}

// ─── Número ───────────────────────────────────────────────────────────────────

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || isNaN(value)) return '-';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return '-';
  return `${value.toFixed(decimals).replace('.', ',')}%`;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value + (value.length === 10 ? 'T00:00:00' : '')) : value;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(d);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value + (value.length === 10 ? 'T00:00:00' : '')) : value;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);
}

// ─── Documentos ───────────────────────────────────────────────────────────────

export function formatCPF(value: string | null | undefined): string {
  if (!value) return '-';
  const n = value.replace(/\D/g, '').slice(0, 11);
  return n
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatCNPJ(value: string | null | undefined): string {
  if (!value) return '-';
  const n = value.replace(/\D/g, '').slice(0, 14);
  return n
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function formatPhone(value: string | null | undefined): string {
  if (!value) return '-';
  const n = value.replace(/\D/g, '');
  if (n.length <= 10) {
    return n
      .slice(0, 10)
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return n
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function formatCEP(value: string | null | undefined): string {
  if (!value) return '-';
  const n = value.replace(/\D/g, '').slice(0, 8);
  return n.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

// ─── Texto ────────────────────────────────────────────────────────────────────

/** Trunca um texto com reticências */
export function truncate(value: string | null | undefined, max = 60): string {
  if (!value) return '-';
  return value.length > max ? value.slice(0, max) + '…' : value;
}

/** Primeiras letras de cada palavra (iniciais) */
export function initials(name: string | null | undefined, max = 2): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, max)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
