import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  getMonthRange,
  parseUuidList,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import {
  fetchSalesReportRows,
  getVendaVendedorNome
} from '$lib/server/relatorios';
import {
  buildConciliacaoSyntheticVendas,
  fetchEffectiveConciliacaoReceipts,
  filterRecibosCanceladosMesmoMes
} from '$lib/conciliacao/source';
import {
  applyRateioToSalesForScopedVendedores,
  fetchRateioByReciboIds,
  fetchSplitSaleIdsForDestinationVendedores
} from '$lib/vendas/rateio';
import { fetchVendasKpiReciboContributions } from '$lib/server/vendas-kpis';

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

function resolveReciboBruto(recibo: any) {
  if (recibo?.valor_bruto_override != null) {
    return Math.max(0, Number(recibo.valor_bruto_override || 0));
  }
  return Math.max(0, Number(recibo?.valor_total || 0));
}

function resolveReciboTaxas(recibo: any) {
  return Math.max(0, Number(recibo?.valor_taxas || 0));
}

function resolveReciboLiquido(recibo: any) {
  if (recibo?.valor_liquido_override != null) {
    return Math.max(0, Number(recibo.valor_liquido_override || 0));
  }
  return Math.max(0, resolveReciboBruto(recibo) - resolveReciboTaxas(recibo));
}

function isSeguroRecibo(recibo: any) {
  if (Boolean(recibo?.is_seguro_viagem)) return true;
  if (String(recibo?.faixa_comissao || '').toUpperCase() === 'SEGURO_32_35') return true;
  const tipo = String(recibo?.tipo_produtos?.tipo || '').toLowerCase();
  const nome = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || '').toLowerCase();
  return tipo.includes('seguro') || nome.includes('seguro');
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
    const currentMonth = getMonthRange();
    const dataInicio = String(searchParams.get('data_inicio') || searchParams.get('inicio') || currentMonth.inicio).trim();
    const dataFim = String(searchParams.get('data_fim') || searchParams.get('fim') || currentMonth.fim).trim();
    const explicitRequestedVendedorIds = parseUuidList(
      searchParams.get('vendedor_ids') || searchParams.get('vendedor_id')
    );
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id'));
    let requestedVendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      searchParams.get('vendedor_ids') || searchParams.get('vendedor_id')
    );
    let vendedorIds = requestedVendedorIds;
    const previousPeriod = getPreviousPeriod(dataInicio, dataFim);

    // Paridade com vtur-app: vendedor/viewer vê ranking geral da empresa,
    // não apenas o próprio usuário.
    if (scope.isVendedor && companyIds.length > 0) {
      const { data: equipeData, error: equipeError } = await client
        .from('users')
        .select('id, active, participa_ranking, user_types(name)')
        .in('company_id', companyIds)
        .eq('active', true)
        .limit(5000);

      if (equipeError) throw equipeError;

      const equipeIds = (equipeData || [])
        .filter((row: any) => {
          const tipoNome = String(row?.user_types?.name || '').toUpperCase();
          const isVendedor = tipoNome.includes('VENDEDOR');
          const isGestorParticipante = tipoNome.includes('GESTOR') && Boolean(row?.participa_ranking);
          return isVendedor || isGestorParticipante;
        })
        .map((row: any) => String(row?.id || '').trim())
        .filter(Boolean);

      if (explicitRequestedVendedorIds.length > 0) {
        const permitidos = new Set(equipeIds);
        vendedorIds = explicitRequestedVendedorIds.filter((id) => permitidos.has(id));
      } else {
        vendedorIds = equipeIds;
      }
    }

    if (vendedorIds.length === 0 && companyIds.length > 0) {
      const { data: companyUsers, error: companyUsersError } = await client
        .from('users')
        .select('id, user_types(name), participa_ranking')
        .in('company_id', companyIds)
        .eq('active', true)
        .limit(5000);

      if (companyUsersError) throw companyUsersError;

      vendedorIds = (companyUsers || [])
        .filter((row: any) => {
          const userType = Array.isArray(row?.user_types) ? row.user_types[0] : row?.user_types;
          const tipoNome = String(userType?.name || '').toUpperCase();
          const isVendedor = tipoNome.includes('VENDEDOR');
          const isGestorParticipante = tipoNome.includes('GESTOR') && Boolean(row?.participa_ranking);
          return isVendedor || isGestorParticipante;
        })
        .map((row: any) => String(row?.id || '').trim())
        .filter(Boolean);
    }

    const rankingTeamMap = new Map<string, { id: string; nome: string }>();
    if (vendedorIds.length > 0) {
      const { data: teamUsers, error: teamUsersError } = await client
        .from('users')
        .select('id, nome_completo, email')
        .in('id', vendedorIds)
        .eq('active', true)
        .limit(5000);

      if (teamUsersError) throw teamUsersError;

      const scopedIds: string[] = [];
      (teamUsers || []).forEach((row: any) => {
        const id = String(row?.id || '').trim();
        const nome = String(row?.nome_completo || row?.email || 'Equipe VTUR');
        if (nome.toLowerCase().includes('baixa rac')) return;
        if (!id) return;
        scopedIds.push(id);
        rankingTeamMap.set(id, {
          id,
          nome
        });
      });
      vendedorIds = scopedIds;
    }

    if (vendedorIds.length === 0) {
      return json({
        items: [],
        total: 0,
        vendedores: [],
        resumo: {
          meta_mes: 0,
          meta_seguro: 0,
          total_receita: 0,
          total_liquido: 0,
          total_seguro: 0,
          total_comissao: 0,
          total_orcamentos: 0,
          total_vendas: 0,
          total_recibos: 0,
          meta_total: 0
        },
        periodo: {
          data_inicio: dataInicio,
          data_fim: dataFim,
          anterior_inicio: previousPeriod.dataInicio,
          anterior_fim: previousPeriod.dataFim,
          referencia_mes_atual: getMonthRange()
        }
      });
    }

    const accessibleClientIds = !scope.isAdmin
      ? await resolveAccessibleClientIds(client, { companyIds, vendedorIds })
      : [];

    let conciliacaoSobrepoeVendas = false;
    if (companyIds.length > 0) {
      const { data: parametrosRows, error: parametrosError } = await client
        .from('parametros_comissao')
        .select('company_id, conciliacao_sobrepoe_vendas')
        .in('company_id', companyIds)
        .limit(1000);

      if (parametrosError) throw parametrosError;

      conciliacaoSobrepoeVendas = (parametrosRows || []).some((row: any) =>
        Boolean(row?.conciliacao_sobrepoe_vendas)
      );
    }

    const mergeSalesRowsById = (baseRows: any[], extraRows: any[]) => {
      const map = new Map<string, any>();
      [...baseRows, ...extraRows].forEach((row) => {
        const id = String(row?.id || '').trim();
        if (!id) return;
        if (!map.has(id)) map.set(id, row);
      });
      return Array.from(map.values());
    };

    const toRateioShape = (rows: any[]) =>
      rows.map((row) => ({
        ...row,
        vendas_recibos: Array.isArray(row?.recibos)
          ? row.recibos
          : Array.isArray(row?.vendas_recibos)
            ? row.vendas_recibos
            : []
      }));

    const getConciliacaoIds = (item: any) => {
      const ids = Array.isArray(item?.conciliacao_ids)
        ? item.conciliacao_ids.map((value: any) => String(value || '').trim()).filter(Boolean)
        : [];
      if (ids.length > 0) return ids;
      const id = String(item?.id || '').trim();
      return id ? [id] : [];
    };

    const buildPeriodRows = async (periodStart: string, periodEnd: string) => {
      let salesRows = toRateioShape(
        await fetchSalesReportRows(client, {
          dataInicio: periodStart,
          dataFim: periodEnd,
          companyIds,
          vendedorIds
        })
      );

      if (vendedorIds.length > 0) {
        const splitSaleIds = await fetchSplitSaleIdsForDestinationVendedores(client, {
          companyId: companyIds[0] || null,
          companyIds,
          vendedorIds
        });

        if (splitSaleIds.length > 0) {
          const splitRows = toRateioShape(
            await fetchSalesReportRows(client, {
              dataInicio: periodStart,
              dataFim: periodEnd,
              companyIds,
              vendaIds: splitSaleIds
            })
          );
          salesRows = mergeSalesRowsById(salesRows, splitRows);
        }
      }

      const concReceipts = await fetchEffectiveConciliacaoReceipts({
        client,
        companyId: companyIds[0] || null,
        companyIds,
        inicio: periodStart,
        fim: periodEnd,
        vendedorIds,
        excludeVendedorIds: undefined
      });

      if (vendedorIds.length > 0) {
        let splitConcQuery = client
          .from('vendas_recibos_rateio')
          .select('conciliacao_recibo_id')
          .eq('ativo', true)
          .in('vendedor_destino_id', vendedorIds)
          .not('conciliacao_recibo_id', 'is', null);

        if (companyIds.length > 0) {
          splitConcQuery = splitConcQuery.in('company_id', companyIds);
        }

        const { data: splitConcRows, error: splitConcErr } = await splitConcQuery;
        if (splitConcErr) throw splitConcErr;

        const splitConcIdSet = new Set(
          (splitConcRows || [])
            .map((row: any) => String(row?.conciliacao_recibo_id || '').trim())
            .filter(Boolean)
        );

        if (splitConcIdSet.size > 0) {
          const concAll = await fetchEffectiveConciliacaoReceipts({
            client,
            companyId: companyIds[0] || null,
            companyIds,
            inicio: periodStart,
            fim: periodEnd,
            vendedorIds: null,
            excludeVendedorIds: undefined
          });

          const seenConcIds = new Set((concReceipts || []).flatMap((item: any) => getConciliacaoIds(item)));
          concAll.forEach((item: any) => {
            const candidateIds = getConciliacaoIds(item);
            if (candidateIds.length === 0) return;
            if (!candidateIds.some((id: string) => splitConcIdSet.has(id))) return;
            if (candidateIds.some((id: string) => seenConcIds.has(id))) return;
            candidateIds.forEach((id: string) => seenConcIds.add(id));
            concReceipts.push(item);
          });
        }
      }

      const overriddenReceiptIds = new Set(
        concReceipts.map((item) => String(item.linked_recibo_id || '').trim()).filter(Boolean)
      );

      const baseSales = salesRows
        .map((sale: any) => {
          const recibos = Array.isArray(sale?.vendas_recibos) ? sale.vendas_recibos : [];
          const withoutOverridden = conciliacaoSobrepoeVendas
            ? recibos.filter(
                (recibo: any) => !overriddenReceiptIds.has(String(recibo?.id || '').trim())
              )
            : recibos;

          return {
            ...sale,
            vendas_recibos: filterRecibosCanceladosMesmoMes(withoutOverridden)
          };
        })
        .filter((sale: any) => Array.isArray(sale?.vendas_recibos) && sale.vendas_recibos.length > 0);

      const mergedSales =
        concReceipts.length > 0
          ? [...baseSales, ...buildConciliacaoSyntheticVendas(concReceipts)]
          : baseSales;

      if (mergedSales.length === 0) return mergedSales;

      const reciboIds = mergedSales
        .flatMap((sale: any) => (Array.isArray(sale?.vendas_recibos) ? sale.vendas_recibos : []))
        .map((recibo: any) => String(recibo?.id || '').trim())
        .filter(Boolean);

      const rateioMap = await fetchRateioByReciboIds(client, reciboIds);
      return applyRateioToSalesForScopedVendedores(mergedSales, rateioMap, vendedorIds);
    };

    const [currentKpiPayload, previousKpiPayload, quotesRes, metasRes] = await Promise.all([
      fetchVendasKpiReciboContributions(client, {
        dataInicio,
        dataFim,
        companyIds,
        vendedorIds,
        accessibleClientIds
      }),
      fetchVendasKpiReciboContributions(client, {
        dataInicio: previousPeriod.dataInicio,
        dataFim: previousPeriod.dataFim,
        companyIds,
        vendedorIds,
        accessibleClientIds
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
        const metasPeriod = getMonthRange();
        let query = client
          .from('metas_vendedor')
          .select('id, vendedor_id, meta_geral, meta_diferenciada, periodo, ativo')
          .eq('ativo', true)
          .gte('periodo', metasPeriod.inicio)
          .lte('periodo', metasPeriod.fim)
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
        total_recibos: number;
        total_receita: number;
        total_liquido: number;
        total_comissao: number;
        total_orcamentos: number;
        meta: number;
        meta_seguro: number;
        total_seguro: number;
      }
    >();
    const previousRevenueMap = new Map<string, number>();
    const salesCountMap = new Map<string, Set<string>>();
    const receiptCountMap = new Map<string, Set<string>>();

    rankingTeamMap.forEach((teamUser) => {
      rankingMap.set(teamUser.id, {
        vendedor_id: teamUser.id,
        vendedor_nome: teamUser.nome,
        total_vendas: 0,
        total_recibos: 0,
        total_receita: 0,
        total_liquido: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0,
        meta_seguro: 0,
        total_seguro: 0
      });
    });

    currentKpiPayload.contributions.forEach((contribution) => {
      const vendedorId = String(contribution.vendedorId || '').trim();
      if (!vendedorId) return;

      const current = rankingMap.get(vendedorId) || {
        vendedor_id: vendedorId,
        vendedor_nome: getVendaVendedorNome(row),
        total_vendas: 0,
        total_recibos: 0,
        total_receita: 0,
        total_liquido: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0,
        meta_seguro: 0,
        total_seguro: 0
      };

      const saleKey = String(contribution.vendaKey || '').trim() || `sale:${vendedorId}`;
      const receiptKey = `${saleKey}::${String(contribution.reciboId || contribution.reciboNumero || '').trim()}`;
      const salesSet = salesCountMap.get(vendedorId) || new Set<string>();
      salesSet.add(saleKey);
      salesCountMap.set(vendedorId, salesSet);
      const receiptsSet = receiptCountMap.get(vendedorId) || new Set<string>();
      if (receiptKey !== `${saleKey}::`) receiptsSet.add(receiptKey);
      receiptCountMap.set(vendedorId, receiptsSet);

      current.total_receita += Number(contribution.bruto || 0);
      current.total_comissao += Number(contribution.taxas || 0);
      current.total_liquido += Number(contribution.bruto || 0) - Number(contribution.taxas || 0);
      if (contribution.isSeguro) {
        current.total_seguro += Number(contribution.bruto || 0);
      }
      rankingMap.set(vendedorId, current);
    });

    rankingMap.forEach((current, vendedorId) => {
      current.total_vendas = salesCountMap.get(vendedorId)?.size || 0;
      current.total_recibos = receiptCountMap.get(vendedorId)?.size || 0;
    });

    previousKpiPayload.contributions.forEach((contribution) => {
      const vendedorId = String(contribution.vendedorId || '').trim();
      if (!vendedorId) return;
      previousRevenueMap.set(
        vendedorId,
        (previousRevenueMap.get(vendedorId) || 0) + Number(contribution.bruto || 0)
      );
    });

    (quotesRes.data || []).forEach((quote: any) => {
      const vendedorId = String(quote?.created_by || '').trim();
      if (!vendedorId) return;

      const current = rankingMap.get(vendedorId) || {
        vendedor_id: vendedorId,
        vendedor_nome: 'Equipe VTUR',
        total_vendas: 0,
        total_recibos: 0,
        total_receita: 0,
        total_liquido: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0,
        meta_seguro: 0,
        total_seguro: 0
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
        total_recibos: 0,
        total_receita: 0,
        total_liquido: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0,
        meta_seguro: 0,
        total_seguro: 0
      };

      current.meta += Number(meta?.meta_geral || 0);
      current.meta_seguro += Number(meta?.meta_diferenciada || 0);
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
        const totalLiquido = item.total_liquido;
        const ticketMedio = item.total_vendas > 0 ? item.total_receita / item.total_vendas : 0;
        const taxaConversao =
          item.total_orcamentos > 0 ? (item.total_vendas / item.total_orcamentos) * 100 : 0;
        const alcanceMeta = item.meta > 0 ? (item.total_receita / item.meta) * 100 : 0;
        const alcanceMetaSeguro = item.meta_seguro > 0 ? (item.total_seguro / item.meta_seguro) * 100 : 0;
        const previousRevenue = previousRevenueMap.get(item.vendedor_id) || 0;

        return {
          ...item,
          total_liquido: totalLiquido,
          ticket_medio: ticketMedio,
          taxa_conversao: taxaConversao,
          alcance_meta: alcanceMeta,
          alcance_meta_seguro: alcanceMetaSeguro,
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
        vendedor_slug: String((item.vendedor_nome ?? '')).toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9\\-]/g, ''),
        vendedor_name_for_template: item.vendedor_nome,
        periodo_range: `${dataInicio} - ${dataFim}`,
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
        meta_mes: items.reduce((sum, item) => sum + item.meta, 0),
        meta_seguro: items.reduce((sum, item) => sum + item.meta_seguro, 0),
        total_receita: items.reduce((sum, item) => sum + item.total_receita, 0),
        total_liquido: items.reduce((sum, item) => sum + item.total_liquido, 0),
        total_seguro: items.reduce((sum, item) => sum + item.total_seguro, 0),
        total_comissao: items.reduce((sum, item) => sum + item.total_comissao, 0),
        total_orcamentos: items.reduce((sum, item) => sum + item.total_orcamentos, 0),
        total_vendas: items.reduce((sum, item) => sum + item.total_vendas, 0),
        total_recibos: items.reduce((sum, item) => sum + item.total_recibos, 0),
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
