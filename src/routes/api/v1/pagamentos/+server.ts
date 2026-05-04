import { json } from '@sveltejs/kit';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  parseIntSafe,
  requireAuthenticatedUser,
  resolveScopedCompanyId,
  resolveScopedCompanyIds,
  resolveUserScope,
  sanitizePostgrestSearchTerm,
  toErrorResponse,
} from '$lib/server/v1';
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  invalidateReadModelCache,
  READ_MODEL_TAGS,
  scopeCacheTags
} from '$lib/server/readModelCache';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';

const MAX_PAGAMENTO_BODY_BYTES = 64 * 1024;
const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function dedupeById<T extends { id?: string | null }>(rows: T[]) {
  const map = new Map<string, T>();
  rows.forEach((row) => {
    const id = String(row?.id || '').trim();
    if (id && !map.has(id)) map.set(id, row);
  });
  return Array.from(map.values());
}

function invalidatePagamentoReadModels(companyId: string | null | undefined, userId: string) {
  invalidateReadModelCache({
    tags: [
      READ_MODEL_TAGS.payments,
      READ_MODEL_TAGS.sales,
      READ_MODEL_TAGS.finance,
      READ_MODEL_TAGS.dashboard,
      READ_MODEL_TAGS.vendasKpis,
      READ_MODEL_TAGS.ranking,
      READ_MODEL_TAGS.comissoes
    ],
    scopeTags: scopeCacheTags({ companyIds: companyId ? [companyId] : [], userId })
  });
}

// GET - Listar pagamentos
export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro'], 1, 'Sem acesso ao Financeiro.');
    }

    const { searchParams } = event.url;
    const vendaId = searchParams.get('venda_id');
    const formaPagamentoId = searchParams.get('forma_pagamento_id');
    const rawBusca = sanitizePostgrestSearchTerm(searchParams.get('q'), 80);
    const busca = rawBusca.length >= 2 ? rawBusca : '';
    const page = Math.max(1, parseIntSafe(searchParams.get('page'), 1));
    const pageSize = Math.min(100, Math.max(1, parseIntSafe(searchParams.get('pageSize'), 50)));
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id'));

    const selectPagamentos = `
      id, venda_id, forma_pagamento_id, company_id, forma_nome, operacao, plano,
      valor_bruto, desconto_valor, valor_total, parcelas_qtd, parcelas_valor,
      vencimento_primeira, paga_comissao, observacoes, created_at, updated_at,
      venda:vendas!venda_id(id, numero_venda),
      forma_pagamento:formas_pagamento!forma_pagamento_id(id, nome)
    `;
    const from = (page - 1) * pageSize;
    const to = page * pageSize - 1;

    const buildQuery = (companyIdsFilter = companyIds, useRange = true) => {
      let query = client
        .from('vendas_pagamentos')
        .select(selectPagamentos, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (useRange) {
        query = query.range(from, to);
      } else {
        query = query.limit(to + 1);
      }

      if (vendaId) query = query.eq('venda_id', vendaId);
      if (formaPagamentoId) query = query.eq('forma_pagamento_id', formaPagamentoId);
      if (companyIdsFilter.length > 0) query = query.in('company_id', companyIdsFilter);
      if (busca) {
        query = query.or(
          [
            `forma_nome.ilike.%${busca}%`,
            `operacao.ilike.%${busca}%`,
            `plano.ilike.%${busca}%`,
            `observacoes.ilike.%${busca}%`
          ].join(',')
        );
      }

      return query;
    };

    const result = await getCachedReadModel<{ items: any[]; total: number }>({
      key: buildReadModelCacheKey('pagamentos:list', {
        vendaId,
        formaPagamentoId,
        companyIds,
        busca,
        page,
        pageSize
      }),
      tags: [READ_MODEL_TAGS.payments, READ_MODEL_TAGS.sales, ...scopeCacheTags({ companyIds, userId: user.id })],
      ttlMs: 10_000,
      staleTtlMs: 45_000,
      loader: async () => {
        if (companyIds.length > SUPABASE_IN_BATCH_SIZE) {
          const rows: any[] = [];
          let total = 0;
          for (const batch of chunkArray(companyIds)) {
            const { data, count, error } = await buildQuery(batch, false);
            if (error) throw error;
            total += Number(count ?? data?.length ?? 0);
            rows.push(...(data || []));
          }

          const items = dedupeById(rows)
            .sort((left, right) => String(right?.created_at || '').localeCompare(String(left?.created_at || '')))
            .slice(from, to + 1);

          return { items, total };
        }

        const { data, count, error } = await buildQuery();
        if (error) throw error;
        return {
          items: (data || []) as any[],
          total: Number(count ?? data?.length ?? 0)
        };
      }
    });

    return json(
      { success: true, items: result.items, total: result.total, page, pageSize },
      { headers: DYNAMIC_READ_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar pagamentos.');
  }
}

// POST - Criar novo pagamento de venda
export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_PAGAMENTO_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['financeiro'], 2, 'Sem permissao para criar pagamentos.');

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};

    if (!isUuid(body.venda_id)) {
      return json({ success: false, error: 'ID da venda invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (body.forma_pagamento_id && !isUuid(body.forma_pagamento_id)) {
      return json({ success: false, error: 'ID da forma de pagamento invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { data: venda, error: vendaErr } = await client
      .from('vendas')
      .select('id, company_id')
      .eq('id', body.venda_id)
      .maybeSingle();

    if (vendaErr) throw vendaErr;
    if (!venda) {
      return json({ success: false, error: 'Venda nao encontrada.' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    const vendaCompanyId = String(venda.company_id || '').trim();
    const targetCompanyId = resolveScopedCompanyId(
      scope,
      body.empresa_id || body.company_id || vendaCompanyId
    );

    if (!targetCompanyId) {
      return json(
        { success: false, error: 'Selecione uma empresa para criar o pagamento.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (!vendaCompanyId || vendaCompanyId !== targetCompanyId) {
      return json({ success: false, error: 'Venda fora do escopo da empresa.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const { data, error } = await client
      .from('vendas_pagamentos')
      .insert([{
        venda_id: body.venda_id,
        company_id: targetCompanyId,
        forma_pagamento_id: body.forma_pagamento_id || null,
        forma_nome: body.forma_nome || body.forma_pagamento || null,
        operacao: body.operacao || null,
        plano: body.plano || null,
        valor_bruto: body.valor_bruto || body.valor || null,
        desconto_valor: body.desconto_valor || null,
        valor_total: body.valor_total || body.valor || null,
        parcelas: body.parcelas || null,
        parcelas_qtd: body.parcelas_qtd || null,
        parcelas_valor: body.parcelas_valor || null,
        vencimento_primeira: body.vencimento_primeira || null,
        paga_comissao: body.paga_comissao ?? null,
        observacoes: body.observacoes || null
      }])
      .select('id, company_id, venda_id, forma_pagamento_id, forma_nome, operacao, plano, valor_bruto, desconto_valor, valor_total, parcelas_qtd, parcelas_valor, vencimento_primeira, paga_comissao, observacoes, created_at, updated_at')
      .single();

    if (error) throw error;

    invalidatePagamentoReadModels(data?.company_id, user.id);

    return json({ success: true, item: data }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao criar pagamento.');
  }
}
