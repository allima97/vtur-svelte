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
import { diffDaysISODate, parseISODateParts, todayISODateLocal } from '$lib/date';

export type ClienteScopedFilters = {
  companyIds: string[];
  vendedorIds: string[];
  accessibleClientIds: string[] | null;
};

export function diffDays(fromDateIso: string, toDate = new Date()) {
  const diff = diffDaysISODate(fromDateIso, todayISODateLocal(toDate));
  return diff ?? Number.POSITIVE_INFINITY;
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
  const todayParts = parseISODateParts(todayISODateLocal(today));
  if (!todayParts) return false;
  return parts.day === todayParts.day && parts.month === todayParts.month;
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

  const companyIds = resolveScopedCompanyIds(scope, companyParam);
  const vendedorIds = await resolveScopedVendedorIds(client, scope, vendedorParam);
  const normalizedClienteId = String(clienteId || '').trim();

  const filters: ClienteScopedFilters = {
    companyIds,
    vendedorIds,
    accessibleClientIds: null
  };

  if (!normalizedClienteId) {
    throw error(400, 'Cliente invalido.');
  }

  if (scope.isAdmin && companyIds.length === 0 && vendedorIds.length === 0) {
    return filters;
  }

  const tipoNome = String(scope.tipoNome || '').toUpperCase();
  const canUseCompanyScope =
    scope.isAdmin ||
    scope.isMaster ||
    scope.isGestor ||
    tipoNome.includes('MASTER') ||
    tipoNome.includes('GESTOR');

  if (canUseCompanyScope) {
    let clienteQuery = client
      .from('clientes')
      .select('id')
      .eq('id', normalizedClienteId)
      .limit(1);

    if (companyIds.length > 0) {
      clienteQuery = clienteQuery.in('company_id', companyIds);
    }

    const { data, error: clienteError } = await clienteQuery.maybeSingle();
    if (clienteError || !data?.id) {
      throw error(403, 'Sem permissao para acessar este cliente.');
    }

    return filters;
  }

  const scopedVendedorIds = vendedorIds.length > 0 ? vendedorIds : [scope.userId].filter(Boolean);
  filters.accessibleClientIds = [normalizedClienteId];

  let clienteCriadoQuery = client
    .from('clientes')
    .select('id')
    .eq('id', normalizedClienteId)
    .limit(1);

  if (companyIds.length > 0) {
    clienteCriadoQuery = clienteCriadoQuery.in('company_id', companyIds);
  }
  if (scopedVendedorIds.length > 0) {
    clienteCriadoQuery = clienteCriadoQuery.in('created_by', scopedVendedorIds);
  }

  const { data: clienteCriado, error: clienteCriadoError } = await clienteCriadoQuery.maybeSingle();
  if (!clienteCriadoError && clienteCriado?.id) {
    return filters;
  }

  let vendaClienteQuery = client
    .from('vendas')
    .select('id')
    .eq('cliente_id', normalizedClienteId)
    .eq('cancelada', false)
    .limit(1);

  if (companyIds.length > 0) {
    vendaClienteQuery = vendaClienteQuery.in('company_id', companyIds);
  }
  if (scopedVendedorIds.length > 0) {
    vendaClienteQuery = vendaClienteQuery.in('vendedor_id', scopedVendedorIds);
  }

  const { data: vendaCliente, error: vendaClienteError } = await vendaClienteQuery.maybeSingle();
  if (vendaClienteError || !vendaCliente?.id) {
    throw error(403, 'Sem permissao para acessar este cliente.');
  }

  return filters;
}
