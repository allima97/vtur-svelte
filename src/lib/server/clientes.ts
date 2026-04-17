import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ensureModuloAccess,
  normalizeText,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  type UserScope
} from '$lib/server/v1';

export type ClienteScopedFilters = {
  companyIds: string[];
  vendedorIds: string[];
  accessibleClientIds: string[] | null;
};

export function diffDays(fromDateIso: string, toDate = new Date()) {
  const from = new Date(fromDateIso);
  const diff = toDate.getTime() - from.getTime();
  return Math.floor(diff / 86400000);
}

export function deriveClienteStatus(
  row: { active?: boolean | null; ativo?: boolean | null },
  ultimaCompra: string | null
) {
  if (row.active === false || row.ativo === false) {
    return 'inativo' as const;
  }

  if (!ultimaCompra) {
    return 'prospect' as const;
  }

  return diffDays(ultimaCompra) <= 365 ? ('ativo' as const) : ('inativo' as const);
}

export function extractBirthMonthDay(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3])
    };
  }

  const brMatch = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (brMatch) {
    return {
      month: Number(brMatch[2]),
      day: Number(brMatch[1])
    };
  }

  return null;
}

export function isBirthdayToday(value?: string | null, today = new Date()) {
  const parts = extractBirthMonthDay(value);
  if (!parts) return false;
  return parts.day === today.getDate() && parts.month === today.getMonth() + 1;
}

export function formatDocumentoDisplay(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '-';
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return value || digits;
}

export function matchesClienteBusca(
  item: Record<string, any>,
  busca: string,
  extraValues: Array<string | null | undefined> = []
) {
  if (!busca) return true;

  const query = normalizeText(busca);
  const digits = busca.replace(/\D/g, '');
  const haystack = [
    item.nome,
    item.email,
    item.telefone,
    item.whatsapp,
    item.cidade,
    item.estado,
    item.status,
    item.cpf,
    item.classificacao,
    item.tipo_cliente,
    item.tipo_pessoa,
    item.tags_text,
    ...extraValues
  ]
    .map((value) => normalizeText(value))
    .join(' ');

  if (haystack.includes(query)) {
    return true;
  }

  if (!digits) return false;

  const documentoDigits = String(item.cpf || '').replace(/\D/g, '');
  const phoneDigits = `${String(item.telefone || '')} ${String(item.whatsapp || '')}`.replace(/\D/g, '');
  return documentoDigits.includes(digits) || phoneDigits.includes(digits);
}

export async function resolveClienteScopedFilters(
  client: SupabaseClient,
  scope: UserScope,
  companyParam?: string | null,
  vendedorParam?: string | null
): Promise<ClienteScopedFilters> {
  const companyIds = resolveScopedCompanyIds(scope, companyParam);
  const vendedorIds = await resolveScopedVendedorIds(client, scope, vendedorParam);

  if (scope.isAdmin && companyIds.length === 0 && vendedorIds.length === 0) {
    return {
      companyIds,
      vendedorIds,
      accessibleClientIds: null
    };
  }

  const accessibleClientIds = await resolveAccessibleClientIds(client, {
    companyIds,
    vendedorIds
  });

  return {
    companyIds,
    vendedorIds,
    accessibleClientIds
  };
}

export async function ensureClienteAccess(
  client: SupabaseClient,
  scope: UserScope,
  clienteId: string,
  companyParam?: string | null,
  vendedorParam?: string | null,
  minLevel = 1
) {
  if (!scope.isAdmin) {
    ensureModuloAccess(scope, ['clientes', 'clientes_consulta', 'vendas'], minLevel, 'Sem acesso a Clientes.');
  }

  const filters = await resolveClienteScopedFilters(client, scope, companyParam, vendedorParam);

  if (!filters.accessibleClientIds) {
    return filters;
  }

  if (!filters.accessibleClientIds.includes(clienteId)) {
    throw error(403, 'Sem permissao para acessar este cliente.');
  }

  return filters;
}
