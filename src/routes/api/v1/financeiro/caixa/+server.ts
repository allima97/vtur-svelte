import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  logServerError,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
  toISODateLocal,
  getMonthRange
} from '$lib/server/v1';
import { addDaysISODate, parseISODateLocal, todayISODateLocal } from '$lib/date';
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  invalidateReadModelCache,
  READ_MODEL_TAGS,
  scopeCacheTags
} from '$lib/server/readModelCache';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro'], 1, 'Sem acesso ao Financeiro.');
    }

    const { searchParams } = event.url;
    const periodo = searchParams.get('periodo') || 'mes_atual';
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id'));

    let inicio: string;
    let fim: string;
    if (dataInicio && dataFim) {
      inicio = dataInicio;
      fim = dataFim;
    } else if (periodo === 'semana') {
      const hojeIso = todayISODateLocal();
      const hoje = parseISODateLocal(hojeIso) || new Date();
      const sete = new Date(hoje);
      sete.setDate(hoje.getDate() - 7);
      inicio = addDaysISODate(hojeIso, -7) || toISODateLocal(sete);
      fim = hojeIso;
    } else {
      const range = getMonthRange();
      inicio = range.inicio;
      fim = range.fim;
    }

    let vendaIds: string[] = [];
    if (companyIds.length > 0) {
      vendaIds = await getCachedReadModel<string[]>({
        key: buildReadModelCacheKey('caixa:venda-ids', {
          companyIds,
          inicio,
          fim
        }),
        tags: [
          READ_MODEL_TAGS.finance,
          READ_MODEL_TAGS.sales,
          ...scopeCacheTags({ companyIds, userId: user.id })
        ],
        ttlMs: 10_000,
        staleTtlMs: 45_000,
        loader: async () => {
          const { data: vendasScope } = await client
            .from('vendas')
            .select('id')
            .in('company_id', companyIds)
            .gte('data_venda', inicio)
            .lte('data_venda', fim)
            .limit(5000);
          return (vendasScope || []).map((v: any) => String(v.id || '').trim()).filter(Boolean);
        }
      });
      if (vendaIds.length === 0) {
        return json({
          success: true,
          periodo: { inicio, fim },
          resumo: {
            totalEntradas: 0,
            totalSaidas: 0,
            totalPendente: 0,
            totalDivergente: 0,
            totalMovimentacoes: 0,
            saldo: 0
          },
          porFormaPagamento: [],
          movimentacoes: []
        });
      }
    }

    let pagamentosQuery = client
      .from('vendas_pagamentos')
      .select('id, venda_id, forma_nome, valor_total, created_at, venda:vendas!venda_id(numero_venda, cliente_id, data_venda, company_id)')
      .gte('created_at', inicio + 'T00:00:00')
      .lte('created_at', fim + 'T23:59:59');

    if (vendaIds.length > 0) {
      pagamentosQuery = pagamentosQuery.in('venda_id', vendaIds);
    }

    const pagamentos = await getCachedReadModel<any[]>({
      key: buildReadModelCacheKey('caixa:pagamentos', {
        companyIds,
        vendaIds,
        inicio,
        fim
      }),
      tags: [
        READ_MODEL_TAGS.finance,
        READ_MODEL_TAGS.payments,
        READ_MODEL_TAGS.sales,
        ...scopeCacheTags({ companyIds, userId: user.id })
      ],
      ttlMs: 10_000,
      staleTtlMs: 45_000,
      loader: async () => {
        const { data, error: pagError } = await pagamentosQuery;
        if (pagError) {
          logServerError('[caixa] Erro pagamentos', pagError);
          return [];
        }
        return data || [];
      }
    });

    let movQuery = client
      .from('caixa_movimentacoes')
      .select('id, tipo, categoria, descricao, valor, data_movimentacao, forma_pagamento:forma_pagamento_id(id, nome)')
      .gte('data_movimentacao', inicio)
      .lte('data_movimentacao', fim)
      .order('data_movimentacao', { ascending: false });

    if (companyIds.length > 0) movQuery = movQuery.in('company_id', companyIds);

    const movimentacoes = await getCachedReadModel<any[]>({
      key: buildReadModelCacheKey('caixa:movimentacoes', {
        companyIds,
        inicio,
        fim
      }),
      tags: [READ_MODEL_TAGS.finance, ...scopeCacheTags({ companyIds, userId: user.id })],
      ttlMs: 10_000,
      staleTtlMs: 45_000,
      loader: async () => {
        const { data, error: movError } = await movQuery;
        if (movError) {
          logServerError('[caixa] caixa_movimentacoes', movError);
          return [];
        }
        return data || [];
      }
    });

    const pagItems = pagamentos || [];
    const movItems = movimentacoes || [];

    const totalEntradasPagamentos = pagItems.reduce((sum: number, p: any) => sum + Number(p.valor_total || 0), 0);
    const totalEntradasMovimentacoes = movItems
      .filter((m: any) => String(m.tipo || '').toLowerCase() === 'entrada')
      .reduce((sum: number, m: any) => sum + Number(m.valor || 0), 0);
    const totalSaidas = movItems
      .filter((m: any) => String(m.tipo || '').toLowerCase() === 'saida')
      .reduce((sum: number, m: any) => sum + Number(m.valor || 0), 0);

    const totalEntradas = totalEntradasPagamentos + totalEntradasMovimentacoes;
    const saldo = totalEntradas - totalSaidas;

    const porFormaPagamento = new Map();
    pagItems.forEach((p: any) => {
      const fp = p.forma_nome || 'Nao especificado';
      const atual = porFormaPagamento.get(fp) || { nome: fp, valor: 0, quantidade: 0 };
      atual.valor += Number(p.valor_total || 0);
      atual.quantidade += 1;
      porFormaPagamento.set(fp, atual);
    });

    movItems.forEach((m: any) => {
      const fp = m.forma_pagamento?.nome || 'Nao especificado';
      const atual = porFormaPagamento.get(fp) || { nome: fp, valor: 0, quantidade: 0 };
      const sinal = String(m.tipo || '').toLowerCase() === 'saida' ? -1 : 1;
      atual.valor += sinal * Number(m.valor || 0);
      atual.quantidade += 1;
      porFormaPagamento.set(fp, atual);
    });

    const movimentacoesUnificadas = [
      ...pagItems.map((p: any) => ({
        id: p.id,
        tipo: 'entrada',
        categoria: 'venda',
        descricao: `Pagamento ${p.venda?.numero_venda || p.venda_id?.slice(0, 8) || ''}`,
        valor: Number(p.valor_total || 0),
        data: p.created_at?.slice(0, 10) || '',
        forma_pagamento: p.forma_nome || '-',
        status: 'confirmado',
        cliente: '-',
        origem: 'pagamento'
      })),
      ...movItems.map((m: any) => ({
        id: m.id,
        tipo: m.tipo,
        categoria: m.categoria,
        descricao: m.descricao,
        valor: Number(m.valor || 0),
        data: m.data_movimentacao,
        forma_pagamento: m.forma_pagamento?.nome || '-',
        status: 'confirmado',
        cliente: '-',
        origem: 'caixa'
      }))
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return json({
      success: true,
      periodo: { inicio, fim },
      resumo: {
        totalEntradas,
        totalSaidas,
        totalPendente: 0,
        totalDivergente: 0,
        totalMovimentacoes: movimentacoesUnificadas.length,
        saldo
      },
      porFormaPagamento: Array.from(porFormaPagamento.values()),
      movimentacoes: movimentacoesUnificadas
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar resumo do caixa.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['financeiro'], 2, 'Sem permissao para criar movimentacoes.');

    const body = await event.request.json();
    if (!body.tipo || !body.descricao || body.valor === undefined || !body.data_movimentacao) {
      return json({ success: false, error: 'Tipo, descricao, valor e data sao obrigatorios.' }, { status: 400 });
    }

    const { data, error } = await client
      .from('caixa_movimentacoes')
      .insert([{
        company_id: scope.companyId,
        tipo: body.tipo,
        categoria: body.categoria || 'outro',
        descricao: body.descricao,
        valor: body.valor,
        data_movimentacao: body.data_movimentacao,
        forma_pagamento_id: body.forma_pagamento_id || null,
        observacoes: body.observacoes || null,
        user_id: user.id
      }])
      .select('id, company_id, tipo, categoria, descricao, valor, data_movimentacao, forma_pagamento_id, observacoes, user_id')
      .single();

    if (error) {
      if (String(error.code || '').includes('42P01') || String(error.message || '').includes('does not exist')) {
        return json({ success: true, item: { id: crypto.randomUUID(), ...body, company_id: scope.companyId } });
      }
      throw error;
    }

    const financeScopeTags = scopeCacheTags({
      companyIds: data?.company_id ? [data.company_id] : [],
      userId: user.id
    });
    invalidateReadModelCache({
      tags: [
        READ_MODEL_TAGS.finance,
      ],
      scopeTags: financeScopeTags
    });

    return json({ success: true, item: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao criar movimentacao.');
  }
}
