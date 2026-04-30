import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  getMonthRange,
  parseUuidList,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';


import {
  fetchEffectiveConciliacaoReceipts
} from '$lib/conciliacao/source';
import {
  fetchSalesReportRows
} from '$lib/server/relatorios';
import { normalizeReceiptNumber } from '$lib/conciliacao/receiptNumber';

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

/**
 * Montagem SIMPLIFICADA do ranking — espelha dados da conciliação + vendas manuais.
 * Prioridade: conciliação (já possui valor bruto, taxas, vendedor atribuído).
 * Vendas manuais entram apenas para recibos que NÃO estão na conciliação (dedup por número+data).
 */
async function buildRankingSimple(
  client: any,
  params: {
    dataInicio: string;
    dataFim: string;
    companyIds: string[];
    vendedorIds: string[];
  }
) {
  const { dataInicio, dataFim, companyIds, vendedorIds } = params;

  // 1. Buscar conciliação efetiva para o período e empresas do escopo
  const concReceipts = await fetchEffectiveConciliacaoReceipts({
    client,
    companyId: companyIds[0] || null,
    companyIds,
    inicio: dataInicio,
    fim: dataFim,
    vendedorIds: vendedorIds.length > 0 ? vendedorIds : null,
    excludeVendedorIds: undefined
  });

  // 2. Buscar vendas manuais do período (filtrando por data do recibo)
  const salesRows = await fetchSalesReportRows(client, {
    companyIds,
    vendedorIds: vendedorIds.length > 0 ? vendedorIds : undefined,
    includeCancelled: false,
    dataInicio,
    dataFim,
    filterByReceiptDate: true
  });

  // 3. Dedup: recibos já contados pela conciliação (chave = número normalizado + data)
  const seenReciboKeys = new Set<string>();

  type Contribution = {
    vendaKey: string;
    reciboId?: string;
    reciboNumero?: string;
    vendedorId: string;
    bruto: number;
    taxas: number;
    isSeguro: boolean;
  };

  const contributions: Contribution[] = [];

  // 3a. Adicionar recibos da conciliação
  for (const receipt of concReceipts) {
    const vendedorId = String(receipt.vendedor_id || '').trim();
    if (!vendedorId) continue;
    if (vendedorIds.length > 0 && !vendedorIds.includes(vendedorId)) continue;

    const numero = normalizeReceiptNumber(receipt.documento);
    const data = String(receipt.data_venda || '').slice(0, 10);
    // Recibos com rateio têm id no formato "<concId>::rateio:<vendedorId>".
    // Nesse caso a chave de dedup inclui o vendedorId para permitir que
    // Márcio e Tatiana (por exemplo) entrem separadamente com seus valores
    // proporcionais, sem que a segunda entrada seja barrada pelo seenReciboKeys.
    const isRateioEntry = String(receipt.id || '').includes('::rateio:');
    const key = isRateioEntry
      ? `${numero}::${data}::${vendedorId}`
      : numero && data
        ? `${numero}::${data}`
        : `conc:${receipt.id}`;
    if (seenReciboKeys.has(key)) continue;
    seenReciboKeys.add(key);
    // Para recibos de rateio, também marca a chave simples (numero::data) para
    // impedir que a venda manual correspondente entre duplicada na seção 3b.
    if (isRateioEntry && numero && data) seenReciboKeys.add(`${numero}::${data}`);

    const bruto = Math.max(0, Number(receipt.valor_bruto || 0));
    const taxas = Math.max(0, Number(receipt.valor_taxas || 0));

    contributions.push({
      vendaKey: `conc:${receipt.id}`,
      reciboId: receipt.id,
      reciboNumero: receipt.documento,
      vendedorId,
      bruto,
      taxas,
      isSeguro: Boolean(receipt.is_seguro_viagem)
    });
  }

  // 3b. Adicionar recibos manuais que NÃO estão na conciliação
  for (const row of salesRows) {
    const vendedorId = String(row?.vendedor_id || '').trim();
    if (!vendedorId) continue;
    if (vendedorIds.length > 0 && !vendedorIds.includes(vendedorId)) continue;

    const recibos = Array.isArray((row as any)?.vendas_recibos) ? (row as any).vendas_recibos : [];
    for (const recibo of recibos) {
      const numero = normalizeReceiptNumber(recibo?.numero_recibo);
      const data = String(recibo?.data_venda || '').slice(0, 10);
      const key = numero && data ? `${numero}::${data}` : `venda:${row.id}:${recibo.id}`;

      // Se este recibo já foi contado pela conciliação, pula (não duplica)
      if (seenReciboKeys.has(key)) continue;
      seenReciboKeys.add(key);

      const bruto = Math.max(0, Number(recibo?.valor_total || 0));
      const taxas = Math.max(0, Number(recibo?.valor_taxas || 0));
      const isSeguro = isSeguroRecibo(recibo);

      contributions.push({
        vendaKey: `venda:${row.id}`,
        reciboId: recibo.id,
        reciboNumero: recibo.numero_recibo,
        vendedorId,
        bruto,
        taxas,
        isSeguro
      });
    }
  }

  console.log('[ranking] buildRankingSimple:', {
    periodo: `${dataInicio} - ${dataFim}`,
    empresas: companyIds.length,
    vendedoresNoEscopo: vendedorIds.length,
    conciliacaoRecibos: concReceipts.length,
    vendasManuais: salesRows.length,
    contributionsGeradas: contributions.length
  });

  return contributions;
}

async function fetchGestorEquipeVendedorIds(client: any, gestorId: string) {
  if (!gestorId) return [] as string[];

  try {
    const { data, error } = await client.rpc('gestor_equipe_vendedor_ids', { uid: gestorId });
    if (error) throw error;
    return Array.from(
      new Set(
        (data || [])
          .map((row: any) => String(row?.vendedor_id || '').trim())
          .filter(Boolean)
      )
    );
  } catch {
    const { data, error } = await client
      .from('gestor_vendedor')
      .select('vendedor_id, ativo')
      .eq('gestor_id', gestorId);
    if (error) throw error;

    return Array.from(
      new Set(
        (data || [])
          .filter((row: any) => row?.ativo !== false)
          .map((row: any) => String(row?.vendedor_id || '').trim())
          .filter(Boolean)
      )
    );
  }
}

function isRankingAllowedUser(row: any) {
  if (!row?.id) return false;
  if (row?.active === false) return false;
  if (row?.uso_individual === true) return false;
  const userType = Array.isArray(row?.user_types) ? row.user_types[0] : row?.user_types;
  const tipoNome = String(userType?.name || '').toUpperCase();
  const isVendedor = tipoNome.includes('VENDEDOR');
  const isGestorParticipante = tipoNome.includes('GESTOR') && Boolean(row?.participa_ranking);
  return isVendedor || isGestorParticipante;
}

function getMonthRangeFromKey(monthKey: string) {
  const normalized = String(monthKey || '').trim();
  if (!/^\d{4}-\d{2}$/.test(normalized)) return null;

  const [yearText, monthText] = normalized.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;

  const lastDay = new Date(year, month, 0).getDate();
  return {
    inicio: `${yearText}-${monthText}-01`,
    fim: `${yearText}-${monthText}-${String(lastDay).padStart(2, '0')}`
  };
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['relatorios_ranking_vendas', 'relatorios', 'ranking'], 1, 'Sem acesso ao relatório de ranking.');
    }

    const { searchParams } = event.url;
    const currentMonth = getMonthRange();
    const mesParam = String(searchParams.get('mes') || '').trim();
    const mesRange = getMonthRangeFromKey(mesParam);
    let dataInicio = String(searchParams.get('data_inicio') || searchParams.get('inicio') || currentMonth.inicio).trim();
    let dataFim = String(searchParams.get('data_fim') || searchParams.get('fim') || currentMonth.fim).trim();

    if (mesRange) {
      dataInicio = mesRange.inicio;
      dataFim = mesRange.fim;
    }
    const explicitRequestedVendedorIds = parseUuidList(
      searchParams.get('vendedor_ids') || searchParams.get('vendedor_id')
    );
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id'));
    const tipoNome = String(scope.tipoNome || '').toUpperCase();
    const isAdminByType = tipoNome.includes('ADMIN');
    const isGestorByType = tipoNome.includes('GESTOR');
    const isMasterByType = tipoNome.includes('MASTER');

    let vendedorIds = explicitRequestedVendedorIds;
    const previousPeriod = getPreviousPeriod(dataInicio, dataFim);

    if (isGestorByType) {
      // Gestor vê TODOS os vendedores e gestores elegíveis da(s) empresa(s) do escopo
      const companyRankingUsers = companyIds.length > 0
        ? await (async () => {
            let companyUsersQuery = client
              .from('users')
              .select('id, active, uso_individual, participa_ranking, user_types(name)')
              .eq('active', true)
              .limit(5000);

            companyUsersQuery = companyIds.length === 1
              ? companyUsersQuery.eq('company_id', companyIds[0])
              : companyUsersQuery.in('company_id', companyIds);

            const { data: companyUsersData, error: companyUsersError } = await companyUsersQuery;
            if (companyUsersError) throw companyUsersError;

            return (companyUsersData || []).filter((row: any) => isRankingAllowedUser(row));
          })()
        : [];

      const companyEligibleIds = companyRankingUsers
        .map((row: any) => String(row?.id || '').trim())
        .filter(Boolean);

      if (explicitRequestedVendedorIds.length > 0) {
        const permitidos = new Set(companyEligibleIds);
        vendedorIds = explicitRequestedVendedorIds.filter((id) => permitidos.has(id));
      } else {
        vendedorIds = companyEligibleIds;
      }
    } else if (!isAdminByType && !isMasterByType && companyIds.length > 0) {
      // Vendedor comum vê apenas o próprio ranking
      const selfId = String(scope.userId || '').trim();
      if (explicitRequestedVendedorIds.length > 0) {
        vendedorIds = explicitRequestedVendedorIds.filter((id) => id === selfId);
      } else {
        vendedorIds = selfId ? [selfId] : [];
      }
    }

    if (vendedorIds.length === 0 && companyIds.length > 0) {
      const { data: companyUsers, error: companyUsersError } = await client
        .from('users')
        .select('id, active, uso_individual, user_types(name), participa_ranking')
        .in('company_id', companyIds)
        .eq('active', true)
        .limit(5000);

      if (companyUsersError) throw companyUsersError;

      vendedorIds = (companyUsers || [])
        .filter((row: any) => isRankingAllowedUser(row))
        .map((row: any) => String(row?.id || '').trim())
        .filter(Boolean);
    }

    const rankingTeamMap = new Map<string, { id: string; nome: string }>();
    const gestorIdsSet = new Set<string>();
    if (vendedorIds.length > 0) {
      const { data: teamUsers, error: teamUsersError } = await client
        .from('users')
        .select('id, nome_completo, email, active, uso_individual, participa_ranking, user_types(name)')
        .in('id', vendedorIds)
        .eq('active', true)
        .limit(5000);

      if (teamUsersError) throw teamUsersError;

      const scopedIds: string[] = [];
      (teamUsers || []).forEach((row: any) => {
        if (!isRankingAllowedUser(row)) return;
        const id = String(row?.id || '').trim();
        const nome = String(row?.nome_completo || row?.email || 'Equipe VTUR');
        if (nome.toLowerCase().includes('baixa rac')) return;
        if (!id) return;
        scopedIds.push(id);
        rankingTeamMap.set(id, {
          id,
          nome
        });
        const userType = Array.isArray(row?.user_types) ? row.user_types[0] : row?.user_types;
        const roleName = String(userType?.name || '').toUpperCase();
        if (roleName.includes('GESTOR')) {
          gestorIdsSet.add(id);
        }
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
    let usarTaxasNaMeta = true;
    let focoValor: 'bruto' | 'liquido' = 'bruto';
    if (companyIds.length > 0) {
      const { data: parametrosRows, error: parametrosError } = await client
        .from('parametros_comissao')
        .select('company_id, conciliacao_sobrepoe_vendas, usar_taxas_na_meta, foco_valor')
        .in('company_id', companyIds)
        .limit(1000);

      if (parametrosError) throw parametrosError;

      conciliacaoSobrepoeVendas = (parametrosRows || []).some((row: any) =>
        Boolean(row?.conciliacao_sobrepoe_vendas)
      );
      usarTaxasNaMeta = (parametrosRows || []).some((row: any) =>
        Boolean(row?.usar_taxas_na_meta)
      );
      const temFocoLiquido = (parametrosRows || []).some((row: any) =>
        String(row?.foco_valor || '').toLowerCase() === 'liquido'
      );
      if (temFocoLiquido) focoValor = 'liquido';
    }

    // Montagem simplificada do ranking: conciliação + vendas manuais, dedup por recibo
    const [currentContributions, previousContributions, quotesRes, metasRes] = await Promise.all([
      buildRankingSimple(client, {
        dataInicio,
        dataFim,
        companyIds,
        vendedorIds
      }),
      buildRankingSimple(client, {
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
        const metasReference = getMonthRangeFromKey(dataInicio.slice(0, 7)) || getMonthRange();
        let query = client
          .from('metas_vendedor')
          .select('id, vendedor_id, meta_geral, meta_diferenciada, periodo, ativo')
          .eq('ativo', true)
          .gte('periodo', metasReference.inicio)
          .lte('periodo', metasReference.fim)
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
        base_meta: number;
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
        total_seguro: 0,
        base_meta: 0
      });
    });

    currentContributions.forEach((contribution) => {
      const vendedorId = String(contribution.vendedorId || '').trim();
      if (!vendedorId) return;
      const vendedorNomeFallback = rankingTeamMap.get(vendedorId)?.nome || vendedorId;

      const current = rankingMap.get(vendedorId) || {
        vendedor_id: vendedorId,
        vendedor_nome: vendedorNomeFallback,
        total_vendas: 0,
        total_recibos: 0,
        total_receita: 0,
        total_liquido: 0,
        total_comissao: 0,
        total_orcamentos: 0,
        meta: 0,
        meta_seguro: 0,
        total_seguro: 0,
        base_meta: 0
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

    previousContributions.forEach((contribution) => {
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
        total_seguro: 0,
        base_meta: 0
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
        total_seguro: 0,
        base_meta: 0
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
        // Paridade vtur-app: base da meta respeita foco_valor e usar_taxas_na_meta
        const baseMeta =
          focoValor === 'liquido'
            ? totalLiquido
            : usarTaxasNaMeta
              ? item.total_receita
              : totalLiquido;
        const alcanceMeta = item.meta > 0 ? (baseMeta / item.meta) * 100 : 0;
        const alcanceMetaSeguro = item.meta_seguro > 0 ? (item.total_seguro / item.meta_seguro) * 100 : 0;
        const previousRevenue = previousRevenueMap.get(item.vendedor_id) || 0;

        return {
          ...item,
          base_meta: baseMeta,
          total_liquido: totalLiquido,
          ticket_medio: ticketMedio,
          taxa_conversao: taxaConversao,
          alcance_meta: alcanceMeta,
          alcance_meta_seguro: alcanceMetaSeguro,
          tendencia: normalizeTendencia(item.total_receita, previousRevenue)
        };
      })
      .sort((left, right) => {
        // Paridade vtur-app: gestores sempre ficam depois dos vendedores
        const leftGestor = gestorIdsSet.has(left.vendedor_id);
        const rightGestor = gestorIdsSet.has(right.vendedor_id);
        if (leftGestor !== rightGestor) return leftGestor ? 1 : -1;
        return right.total_receita - left.total_receita;
      })
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
