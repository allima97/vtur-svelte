import type { SupabaseClient } from '@supabase/supabase-js';
import { isUuid, resolveScopedCompanyIds, type UserScope } from '$lib/server/v1';

type RowsResult<T> = { data: T[] | null; error: any };
type SingleResult<T> = { data: T | null; error: any };

function isMissingColumnOrRelation(err: any) {
  const code = String(err?.code || '');
  const message = String(err?.message || '');
  return (
    code === '42703' ||
    code === 'PGRST200' ||
    code === 'PGRST205' ||
    message.includes('42703') ||
    message.includes('PGRST200') ||
    message.includes('PGRST205')
  );
}

async function optionalRows<T>(promise: PromiseLike<RowsResult<T>>) {
  const result = await promise;
  if (result.error) {
    if (isMissingColumnOrRelation(result.error)) return [] as T[];
    throw result.error;
  }
  return (result.data || []) as T[];
}

async function optionalSingle<T>(promise: PromiseLike<SingleResult<T>>) {
  const result = await promise;
  if (result.error) {
    if (isMissingColumnOrRelation(result.error)) return null;
    throw result.error;
  }
  return result.data || null;
}

export type FornecedorRecord = {
  id: string;
  company_id?: string | null;
  nome_completo?: string | null;
  nome_fantasia?: string | null;
  localizacao?: string | null;
  cnpj?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  telefone_emergencia?: string | null;
  responsavel?: string | null;
  tipo_faturamento?: string | null;
  principais_servicos?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Campos computados (não existem no DB)
  produtos_vinculados?: number;
};

function normalizeFornecedor(row: FornecedorRecord) {
  const nomeCompleto = String(row?.nome_completo || '').trim() || null;
  const nomeFantasia = String(row?.nome_fantasia || '').trim() || null;
  const responsavel = String(row?.responsavel || '').trim() || null;

  return {
    ...row,
    nome_completo: nomeCompleto,
    nome_fantasia: nomeFantasia,
    localizacao: String(row?.localizacao || '').trim() || 'brasil',
    responsavel
  };
}

export async function fetchFornecedores(client: SupabaseClient, scope: UserScope, params: URLSearchParams) {
  const requestedCompanyId = String(params.get('empresa_id') || '').trim();
  const companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);

  let query = client.from('fornecedores').select('id', { count: 'exact' }).order('created_at', { ascending: false }).limit(5000);
  if (companyIds.length > 0) {
    query = query.in('company_id', companyIds);
  }

  const base = await query;
  if (base.error) throw base.error;

  const ids = (base.data || []).map((row: any) => String(row.id || '')).filter(Boolean);
  if (ids.length === 0) return { items: [], total: 0 };

  const detailRows = await optionalRows<any>(
    client
      .from('fornecedores')
      .select(
        [
          'id',
          'company_id',
          'nome_completo',
          'nome_fantasia',
          'localizacao',
          'cnpj',
          'cep',
          'cidade',
          'estado',
          'telefone',
          'whatsapp',
          'telefone_emergencia',
          'responsavel',
          'tipo_faturamento',
          'principais_servicos',
          'created_at',
          'updated_at'
        ].join(', ')
      )
      .in('id', ids)
  );

  const products = await optionalRows<any>(
    client.from('produtos').select('id, fornecedor_id').in('fornecedor_id', ids).limit(10000)
  );

  const productsCount = new Map<string, number>();
  products.forEach((row: any) => {
    const key = String(row?.fornecedor_id || '').trim();
    if (!key) return;
    productsCount.set(key, (productsCount.get(key) || 0) + 1);
  });

  const items = detailRows
    .map((row: FornecedorRecord) => {
      const normalized = normalizeFornecedor(row);
      return {
        ...normalized,
        produtos_vinculados: productsCount.get(normalized.id) || 0
      };
    })
    .sort((a: any, b: any) => {
      const aName = String(a.nome_fantasia || a.nome_completo || '').toLowerCase();
      const bName = String(b.nome_fantasia || b.nome_completo || '').toLowerCase();
      return aName.localeCompare(bName);
    });

  return {
    items,
    total: base.count ?? items.length
  };
}

export async function fetchFornecedorById(client: SupabaseClient, id: string) {
  const row = await optionalSingle<any>(
    client
      .from('fornecedores')
      .select(
        [
          'id',
          'company_id',
          'nome_completo',
          'nome_fantasia',
          'localizacao',
          'cnpj',
          'cep',
          'cidade',
          'estado',
          'telefone',
          'whatsapp',
          'telefone_emergencia',
          'responsavel',
          'tipo_faturamento',
          'principais_servicos',
          'created_at',
          'updated_at'
        ].join(', ')
      )
      .eq('id', id)
      .maybeSingle()
  );

  if (!row) return null;

  const produtos = await optionalRows(
    client
      .from('produtos')
      .select('id, nome, destino')
      .eq('fornecedor_id', id)
      .order('nome', { ascending: true })
      .limit(200)
  );

  return {
    ...normalizeFornecedor(row),
    produtos,
    vouchers: []
  };
}

export function sanitizeFornecedorPayload(body: any, scope: UserScope) {
  const nomeCompleto = String(body?.nome_completo || '').trim();
  const nomeFantasia = String(body?.nome_fantasia || '').trim();
  const localizacao = String(body?.localizacao || '').trim() === 'exterior' ? 'exterior' : 'brasil';
  const companyId = isUuid(body?.company_id) ? String(body.company_id) : scope.companyId;

  return {
    company_id: companyId || null,
    nome_completo: nomeCompleto || null,
    nome_fantasia: nomeFantasia || null,
    localizacao,
    cnpj: localizacao === 'brasil' ? String(body?.cnpj || '').trim() || null : null,
    cep: localizacao === 'brasil' ? String(body?.cep || '').trim() || null : null,
    cidade: String(body?.cidade || '').trim() || null,
    estado: String(body?.estado || '').trim() || null,
    telefone: String(body?.telefone || '').trim() || null,
    whatsapp: String(body?.whatsapp || '').trim() || null,
    telefone_emergencia: String(body?.telefone_emergencia || '').trim() || null,
    responsavel: String(body?.responsavel || '').trim() || null,
    tipo_faturamento: String(body?.tipo_faturamento || '').trim() || 'pre_pago',
    principais_servicos: String(body?.principais_servicos || '').trim() || null
  };
}
