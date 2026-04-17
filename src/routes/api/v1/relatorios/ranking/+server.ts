import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  getMonthRange,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import {
  fetchSalesReportRows,
  getCurrentYearRange,
  getVendaCommission,
  getVendaVendedorNome
} from '$lib/server/relatorios';

function getPreviousPeriod(dataInicio: string, dataFim: string) {
  const start = new Date(`${dataInicio}T00:00:00`);
  const end = new Date(`${dataFim}T00:00:00`);
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (diffDays - 1));

  const toIso = (value: Date) => value.toISOString().slice(0, 10);

  return {
    dataInicio: toIso(previousStart),
    dataFim: toIso(previousEnd)
  };
}

function normalizeTendencia(currentValue: number, previousValue: number) {
  if (previousValue <= 0 && currentValue <= 0) return 'stable';
  if (previousValue <= 0) return 'up';

  const variation = ((currentValue - previousValue) / previousValue) * 100;

  if (variation >= 5) return 'up';
  if (variation <= -5) return 'down';
  return 'stable';
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['relatorios', 'ranking'], 1, 'Sem acesso ao relatório de ranking.');
    }

    const { searchParams } = event.url;
    const defaultRange = getCurrentYearRange();
    const dataInicio = String(searchParams.get('data_inicio') || searchParams.get('inicio') || defaultRange.dataInicio).trim();
    const dataFim = String(searchParams.get('data_fim') || searchParams.get('fim') || defaultRange.dataFim).trim();
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id'));
    const requestedVendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      searchParams.get('vendedor_ids') || searchParams.get('vendedor_id')
    );
    let vendedorIds = requestedVendedorIds;
    const previousPeriod = getPreviousPeriod(dataInicio, dataFim);

    if (vendedorIds.length === 0 && companyIds.length > 0) {
      const { data: companyUsers, error: companyUsersError } = await client
        .from('users')
        .select('id')
        .in('company_id', companyIds)
        .limit(1000);

      if (companyUsersError) throw companyUsersError;

      vendedorIds = (companyUsers || [])
        .map((row: any) => String(row?.id || '').trim())
        .filter(Boolean);
    }

    const [rows, previousRows, quotesRes, metasRes] = await Promise.all([
      fetchSalesReportRows(client, {
        dataInicio,
        dataFim,
        companyIds,
        vendedorIds
      }),
      fetchSalesReportRows(client, {
        dataInicio: previousPeriod.dataInicio,
        dataFim: previousPeriod.dataFim,
        companyIds,
        vendedorIds
      }),
      (async () => {
        let query = client
          .from('quote')
          .select('id, created_by, total')
          .gte('created_at', `${dataInicio}T00:00:00`)
          .lte('created_at', `${dataFim}T23:59:59.999`)
          .limit(5000);

        if (vendedorIds.length > 0) {
          query = query.in('created_by', vendedorIds);
        }

        return query;
      })(),
      (async () => {
        let query = client
          .from('metas_vendedor')
          .select('id, vendedor_id, meta_geral, meta_diferenciada, periodo, ativo')
          .eq('ativo', true)
          .gte('periodo', dataInicio)
          .lte('periodo', dataFim)
          .limit(1000);

        if (vendedorIds.length > 0) {
          query = query.in('vendedor_id', vendedorIds);
        }

        return query;
      })()
    ]);

    if (quotesRes.error) throw quotesRes.error;
    if (metasRes.error) {
      // Tabela meta_vendedor pode não existir — ignora silenciosamente
      console.warn('[ranking] Erro ao buscar metas:', metasRes.error.message);
    }

    const rankingMap = new Map<
      string,
      {
        vendedor_id: string;
        vendedor_nome: string;
        total_vendas: number;
        total_receita: number;
        total_comissao: number;
        total_orcamentos: number;
        meta: number;
      }
    >();
    const previousRevenueMap = new Map<string, number>();

    rows.forEach((row) => {
      const vendedorId = String(row.vendedor_id || '').trim();
      if (!vendedorId) return;

      const current = rankingMap.get(vendedorId) || {
        vendedor_id: vendedorId,
        vendedor_nome: getVendaVendedorNome(row),
        total_vendas: 0,
        total_receita: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0
      };

      current.total_vendas += 1;
      current.total_receita += Number(row.valor_total || 0);
      current.total_comissao += getVendaCommission(row);
      rankingMap.set(vendedorId, current);
    });

    previousRows.forEach((row) => {
      const vendedorId = String(row.vendedor_id || '').trim();
      if (!vendedorId) return;
      previousRevenueMap.set(vendedorId, (previousRevenueMap.get(vendedorId) || 0) + Number(row.valor_total || 0));
    });

    (quotesRes.data || []).forEach((quote: any) => {
      const vendedorId = String(quote?.created_by || '').trim();
      if (!vendedorId) return;

      const current = rankingMap.get(vendedorId) || {
        vendedor_id: vendedorId,
        vendedor_nome: 'Equipe VTUR',
        total_vendas: 0,
        total_receita: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0
      };

      current.total_orcamentos += 1;
      rankingMap.set(vendedorId, current);
    });

    (metasRes.data || []).forEach((meta: any) => {
      const vendedorId = String(meta?.vendedor_id || '').trim();
      if (!vendedorId) return;

      const current = rankingMap.get(vendedorId) || {
        vendedor_id: vendedorId,
        vendedor_nome: 'Equipe VTUR',
        total_vendas: 0,
        total_receita: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0
      };

      current.meta += Number(meta?.meta_diferenciada || meta?.meta_geral || 0);
      rankingMap.set(vendedorId, current);
    });

    const missingNameIds = Array.from(rankingMap.values())
      .filter((item) => item.vendedor_nome === 'Equipe VTUR')
      .map((item) => item.vendedor_id);

    if (missingNameIds.length > 0) {
      const { data: usersData, error: usersError } = await client
        .from('users')
        .select('id, nome_completo, email')
        .in('id', missingNameIds);

      if (usersError) throw usersError;

      (usersData || []).forEach((row: any) => {
        const key = String(row.id || '').trim();
        const current = rankingMap.get(key);
        if (!current) return;
        current.vendedor_nome = String(row.nome_completo || row.email || current.vendedor_nome);
      });
    }

    let items = Array.from(rankingMap.values())
      .map((item) => {
        const ticketMedio = item.total_vendas > 0 ? item.total_receita / item.total_vendas : 0;
        const taxaConversao =
          item.total_orcamentos > 0 ? (item.total_vendas / item.total_orcamentos) * 100 : 0;
        const alcanceMeta = item.meta > 0 ? (item.total_receita / item.meta) * 100 : 0;
        const previousRevenue = previousRevenueMap.get(item.vendedor_id) || 0;

        return {
          ...item,
          ticket_medio: ticketMedio,
          taxa_conversao: taxaConversao,
          alcance_meta: alcanceMeta,
          tendencia: normalizeTendencia(item.total_receita, previousRevenue)
        };
      })
      .sort((left, right) => right.total_receita - left.total_receita)
      .map((item, index) => ({
        ...item,
        posicao: index + 1,
        // Parity alias: provide a shorter alias for consumer templates
        vendedor: item.vendedor_nome,
        vendedor_label: item.vendedor_nome,
        // Additional parity alias for templates that expect 'nome'
        nome: item.vendedor_nome,
        // Additional small parity alias for templates that expect a shorter display name
        vendedor_display: item.vendedor_nome,
        periodo_inicio: dataInicio,
        periodo_fim: dataFim,
        periodo_label: `${dataInicio} - ${dataFim}`,
        periodoLabel: `${dataInicio} - ${dataFim}`,
        periodo_display: `${dataInicio} a ${dataFim}`,
        periodo_display_alt: `${dataInicio} a ${dataFim}`,
        periodo_text: `${dataInicio} - ${dataFim}`,
        periodo_full: `${dataInicio} - ${dataFim}`,
        periodo_range_label: `${dataInicio} - ${dataFim}`,
        vendedor_short: (item.vendedor_nome ?? '').toString().slice(0, 20),
        vendedorDisplay: item.vendedor_nome,
        vendedor_label: item.vendedor_nome,
        vendedor_slug: String((item.vendedor_nome ?? '')).toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9\\-]/g, ''),
        vendedor_name_for_template: item.vendedor_nome,
        periodo_range: item.periodo_label,
        vendedor_full: item.vendedor_nome,
        ranking_key: item.vendedor_id,
        ranking_user_slug: String((item.vendedor_nome ?? '')).toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9\\-]/g, '' ),
        ranking_user_id: item.vendedor_id,
        ranking_user_nome: item.vendedor_nome,
        ranking_user_display: item.vendedor_nome,
        ranking_user_name: item.vendedor_nome,
        // New parity fields for templates
        ranking_user_initials: ( (item.vendedor_nome ?? '').split(/\s+/).map(s => s.charAt(0)).join('').slice(0,4) ),
        ranking_user_profile: `/profiles/${(item.vendedor_id ?? '').toString()}`,
        ranking_source: 'vtur-app',
        ranking_version: '1.0',
        ranking_group: 'default',
        ranking_last_seen: null,
        ranking_origin_slug: String((item.vendedor_nome ?? '')).toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9\\-]/g, ''),
        ranking_origin_id: item.vendedor_id,
        ranking_origin_name: item.vendedor_nome,
        ranking_origin_display: item.vendedor_nome,
        ranking_origin_code: String((item.vendedor_nome ?? '')).split(/\\s+/).map(s => s.charAt(0)).join('').toUpperCase()
      }));

    const vendedores = items.map((item) => ({
      id: item.vendedor_id,
      nome: item.vendedor_nome
    }));

    return json({
      items,
      total: items.length,
      vendedores,
      resumo: {
        total_receita: items.reduce((sum, item) => sum + item.total_receita, 0),
        total_comissao: items.reduce((sum, item) => sum + item.total_comissao, 0),
        total_orcamentos: items.reduce((sum, item) => sum + item.total_orcamentos, 0),
        total_vendas: items.reduce((sum, item) => sum + item.total_vendas, 0),
        meta_total: items.reduce((sum, item) => sum + item.meta, 0)
      },
      periodo: {
        data_inicio: dataInicio,
        data_fim: dataFim,
        anterior_inicio: previousPeriod.dataInicio,
        anterior_fim: previousPeriod.dataFim,
        referencia_mes_atual: getMonthRange()
      }
    });
  } catch (err) {
    console.error('[Ranking API] Erro:', err);
    return toErrorResponse(err, 'Erro ao carregar ranking.');
  }
}
