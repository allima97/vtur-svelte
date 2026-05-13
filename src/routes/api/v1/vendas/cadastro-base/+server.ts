import { json, type RequestEvent } from '@sveltejs/kit';
import { SHORT_DYNAMIC_READ_HEADERS } from '$lib/server/httpCache';
import {
  ensureModuloAccess,
  fetchRankingVendedoresByCompanyIds,
  getAdminClient,
  hasModuloAccess,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags
} from '$lib/server/readModelCache';
import { chunkArray, dedupeById, SUPABASE_IN_BATCH_SIZE } from '$lib/utils/array';

const PT_BR_COLLATOR = new Intl.Collator('pt-BR');
const PT_BR_BASE_COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base' });

type QueryErrorLike = {
  code?: string | null;
  message?: string | null;
};

type QueryResultLike<T> = {
  data?: T[] | null;
  error?: QueryErrorLike | null;
};

type CidadeRow = {
  id?: string | null;
  nome?: string | null;
  grau_importancia?: number | string | null;
  subdivisao?: {
    nome?: string | null;
    codigo_admin1?: string | null;
  } | null;
};

type CidadeOption = {
  id: string | null | undefined;
  nome: string | null | undefined;
  subdivisao: CidadeRow['subdivisao'];
  estado: string | null;
  grau_importancia: number | null;
  label: string;
};

type EmpresaRow = {
  id?: string | null;
  nome_fantasia?: string | null;
  nome_empresa?: string | null;
};

type ProdutoRow = {
  ativo?: boolean | null;
  cidade_id?: string | null;
  todas_as_cidades?: boolean | null;
} & Record<string, unknown>;

function isIgnorableQueryError(err: unknown) {
  const error = err && typeof err === 'object' ? (err as QueryErrorLike) : null;
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === 'PGRST205' || code === '42P01' || code === '42703' || message.includes('PGRST205') || message.includes('42P01') || message.includes('42703');
}

function safeRows<T = unknown>(result: QueryResultLike<T> | null | undefined, options?: { optional?: boolean }) {
  const optional = options?.optional ?? true;
  const err = result?.error;
  if (err) {
    if (optional || isIgnorableQueryError(err)) return [] as T[];
    throw err;
  }
  return (result?.data || []) as T[];
}

function getImportanceRank(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 9999;
}

const INITIAL_CLIENTES_LIMIT = 300;
const INITIAL_CIDADES_LIMIT = 500;

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas', 'vendas_cadastro'], 1, 'Sem acesso a Vendas.');
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('empresa_id'));
    const activeCompanyIds = companyIds.length > 0 ? companyIds : scope.companyId ? [scope.companyId] : [];

    let vendedoresEquipe: Array<{ id: string; nome_completo: string | null; company_id?: string | null }> = [
      { id: scope.userId, nome_completo: scope.nome || 'Você', company_id: scope.companyId || null }
    ];
    let clientes: unknown[] = [];
    let cidades: CidadeOption[] = [];
    let produtos: ProdutoRow[] = [];
    let tipos: unknown[] = [];
    let tiposPacote: unknown[] = [];
    let formasPagamento: unknown[] = [];
    let empresas: Array<{ id: string | null | undefined; nome: string }> = [];
    const canLoadClientes =
      scope.isAdmin ||
      !scope.isFinanceiro ||
      hasModuloAccess(scope, ['clientes', 'clientes_consulta'], 1);

    const cacheScopeTags = scopeCacheTags({ companyIds: activeCompanyIds, userId: user.id });

    if ((scope.isGestor || scope.isMaster || scope.isFinanceiro) && activeCompanyIds.length > 0) {
      const data = await getCachedReadModel<Array<{ id?: string | null; nome_completo?: string | null; email?: string | null; company_id?: string | null }>>({
        key: buildReadModelCacheKey('vendas-cadastro-base:vendedores', {
          companyIds: activeCompanyIds
        }),
        tags: [READ_MODEL_TAGS.users, ...cacheScopeTags],
        ttlMs: 30_000,
        staleTtlMs: 120_000,
        loader: () => fetchRankingVendedoresByCompanyIds(client, activeCompanyIds)
      });
      vendedoresEquipe = (data || [])
        .map((row) => ({
          id: String(row.id || '').trim(),
          nome_completo: row.nome_completo || row.email || 'Vendedor',
          company_id: row.company_id || null
        }))
        .filter((row) => row.id)
        .sort((a, b) => PT_BR_COLLATOR.compare(String(a.nome_completo || ''), String(b.nome_completo || '')));
    }

    const buildClientesQuery = (idsFilter: string[]) => {
      let query = client
        .from('clientes')
        .select('id, nome, cpf, telefone, email, whatsapp, company_id')
        .order('nome', { ascending: true })
        .limit(INITIAL_CLIENTES_LIMIT);
      if (idsFilter.length > 0) query = query.in('company_id', idsFilter);
      return query;
    };

    const fetchClientesBase = async () => {
      if (!canLoadClientes) return { data: [], error: null };
      if (activeCompanyIds.length <= SUPABASE_IN_BATCH_SIZE) return buildClientesQuery(activeCompanyIds);

      const rows: any[] = [];
      for (const batch of chunkArray(activeCompanyIds)) {
        const result = await buildClientesQuery(batch);
        if (result.error) return result;
        rows.push(...(result.data || []));
      }

      return {
        data: dedupeById(rows)
          .sort((left, right) => PT_BR_COLLATOR.compare(String(left?.nome || ''), String(right?.nome || '')))
          .slice(0, INITIAL_CLIENTES_LIMIT),
        error: null
      };
    };

    // cidades schema: id, nome, subdivisao_id — state comes from subdivisoes join (nome, codigo_admin1)
    const cidadesQuery = getCachedReadModel({
      key: buildReadModelCacheKey('vendas-cadastro-base:cidades', {}),
      tags: [READ_MODEL_TAGS.catalog],
      ttlMs: 60_000,
      staleTtlMs: 300_000,
      loader: async () =>
        await client
          .from('cidades')
          .select('id, nome, grau_importancia, subdivisao:subdivisoes(nome, codigo_admin1)')
          .order('grau_importancia', { ascending: true, nullsFirst: false })
          .order('nome', { ascending: true })
          .limit(INITIAL_CIDADES_LIMIT)
    });
    const produtosQuery = getCachedReadModel({
      key: buildReadModelCacheKey('vendas-cadastro-base:produtos', {}),
      tags: [READ_MODEL_TAGS.catalog],
      ttlMs: 60_000,
      staleTtlMs: 300_000,
      loader: async () =>
        await client
          .from('produtos')
          .select('id, nome, cidade_id, tipo_produto, destino, todas_as_cidades, ativo, informacoes_importantes, fornecedor_id')
          .order('nome', { ascending: true })
          .limit(2000)
    });
    const tiposQuery = getCachedReadModel({
      key: buildReadModelCacheKey('vendas-cadastro-base:tipos-produto', {}),
      tags: [READ_MODEL_TAGS.catalog],
      ttlMs: 60_000,
      staleTtlMs: 300_000,
      loader: async () => await client.from('tipo_produtos').select('id, nome, tipo').order('nome', { ascending: true }).limit(200)
    });
    const pacotesQuery = getCachedReadModel({
      key: buildReadModelCacheKey('vendas-cadastro-base:tipos-pacote', {}),
      tags: [READ_MODEL_TAGS.catalog, READ_MODEL_TAGS.comissoes],
      ttlMs: 60_000,
      staleTtlMs: 300_000,
      loader: async () => await client.from('tipo_pacotes').select('id, nome, ativo').order('nome', { ascending: true }).limit(200)
    });
    const buildFormasQuery = (idsFilter: string[]) => {
      let query = client
        .from('formas_pagamento')
        .select('id, nome, paga_comissao, permite_desconto, desconto_padrao_pct')
        .order('nome', { ascending: true })
        .limit(200);
      if (idsFilter.length > 0) query = query.in('company_id', idsFilter);
      return query;
    };

    const fetchFormasBase = async () => {
      if (activeCompanyIds.length <= SUPABASE_IN_BATCH_SIZE) return buildFormasQuery(activeCompanyIds);

      const rows: any[] = [];
      for (const batch of chunkArray(activeCompanyIds)) {
        const result = await buildFormasQuery(batch);
        if (result.error) return result;
        rows.push(...(result.data || []));
      }

      return {
        data: dedupeById(rows)
          .sort((left, right) => PT_BR_COLLATOR.compare(String(left?.nome || ''), String(right?.nome || '')))
          .slice(0, 200),
        error: null
      };
    };

    const buildEmpresasQuery = (idsFilter: string[]) =>
      client
        .from('companies')
        .select('id, nome_fantasia, nome_empresa')
        .in('id', idsFilter)
        .order('nome_fantasia', { ascending: true });

    const fetchEmpresasBase = async () => {
      if (activeCompanyIds.length === 0) return { data: [], error: null };
      if (activeCompanyIds.length <= SUPABASE_IN_BATCH_SIZE) return buildEmpresasQuery(activeCompanyIds);

      const rows: any[] = [];
      for (const batch of chunkArray(activeCompanyIds)) {
        const result = await buildEmpresasQuery(batch);
        if (result.error) return result;
        rows.push(...(result.data || []));
      }

      return {
        data: dedupeById(rows).sort((left, right) =>
          PT_BR_COLLATOR.compare(
            String(left?.nome_fantasia || left?.nome_empresa || ''),
            String(right?.nome_fantasia || right?.nome_empresa || '')
          )
        ),
        error: null
      };
    };

    const [
      clientesRes,
      cidadesRes,
      produtosRes,
      tiposRes,
      pacotesRes,
      formasRes,
      empresasRes
    ] = (await Promise.all([
      getCachedReadModel({
        key: buildReadModelCacheKey('vendas-cadastro-base:clientes', {
          companyIds: activeCompanyIds,
          canLoadClientes
        }),
        tags: [READ_MODEL_TAGS.clients, ...cacheScopeTags],
        ttlMs: 30_000,
        staleTtlMs: 120_000,
        loader: fetchClientesBase
      }),
      cidadesQuery,
      produtosQuery,
      tiposQuery,
      pacotesQuery,
      getCachedReadModel({
        key: buildReadModelCacheKey('vendas-cadastro-base:formas-pagamento', {
          companyIds: activeCompanyIds
        }),
        tags: [READ_MODEL_TAGS.payments, READ_MODEL_TAGS.finance, ...cacheScopeTags],
        ttlMs: 30_000,
        staleTtlMs: 120_000,
        loader: fetchFormasBase
      }),
      getCachedReadModel({
        key: buildReadModelCacheKey('vendas-cadastro-base:empresas', {
          companyIds: activeCompanyIds
        }),
        tags: [READ_MODEL_TAGS.users, ...cacheScopeTags],
        ttlMs: 30_000,
        staleTtlMs: 120_000,
        loader: fetchEmpresasBase
      })
    ])) as any[];

    clientes = safeRows(clientesRes);
    const cidadesRaw = safeRows<CidadeRow>(cidadesRes);
    cidades = cidadesRaw
      .map((row) => {
      // subdivisoes.codigo_admin1 = state code (e.g. "SP"), subdivisoes.nome = state name
        const sub = row?.subdivisao;
        const estado = sub?.codigo_admin1 || sub?.nome || null;
        return {
          id: row.id,
          nome: row.nome,
          subdivisao: sub,
          estado,
          grau_importancia: row?.grau_importancia == null ? null : Number(row.grau_importancia),
          label: estado ? `${row?.nome || ''} (${estado})` : row?.nome || ''
        };
      })
      .sort((a, b) => {
        const importanceDiff = getImportanceRank(a?.grau_importancia) - getImportanceRank(b?.grau_importancia);
        if (importanceDiff !== 0) return importanceDiff;
        const nomeDiff = PT_BR_BASE_COLLATOR.compare(String(a?.nome || ''), String(b?.nome || ''));
        if (nomeDiff !== 0) return nomeDiff;
        return PT_BR_BASE_COLLATOR.compare(String(a?.estado || ''), String(b?.estado || ''));
      });
    produtos = safeRows<ProdutoRow>(produtosRes);
    tipos = safeRows(tiposRes);
    tiposPacote = safeRows(pacotesRes);
    formasPagamento = safeRows(formasRes);
    empresas = safeRows<EmpresaRow>(empresasRes).map((row) => ({
      id: row.id,
      nome: row.nome_fantasia || row.nome_empresa || 'Empresa sem nome'
    }));

    const warningParts: string[] = [];
    if (clientesRes?.error) warningParts.push('clientes');
    if (cidadesRes?.error) warningParts.push('cidades');
    if (produtosRes?.error) warningParts.push('produtos');
    if (tiposRes?.error) warningParts.push('tipo_produtos');
    if (pacotesRes?.error) warningParts.push('tipo_pacotes');
    if (formasRes?.error) warningParts.push('formas_pagamento');
    const warning = warningParts.length > 0 ? `Falha parcial em: ${warningParts.join(', ')}` : null;

    return json({
      user: {
        id: scope.userId,
        papel: scope.papel,
        company_id: scope.companyId,
        company_ids: activeCompanyIds,
        uso_individual: scope.usoIndividual,
        is_gestor: scope.isGestor,
        can_assign_vendedor: scope.isGestor || scope.isMaster || scope.isFinanceiro || scope.isAdmin
      },
      empresas,
      vendedoresEquipe,
      clientes,
      cidades,
      produtos: produtos
        .filter((row) => row?.ativo !== false)
        .map((row) => ({
          ...row,
          todas_as_cidades: row?.todas_as_cidades === true || (!row?.cidade_id && row?.todas_as_cidades !== false)
        })),
      tipos,
      tiposPacote,
      formasPagamento,
      warning
    }, {
      headers: SHORT_DYNAMIC_READ_HEADERS
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar base do cadastro de vendas.');
  }
}
