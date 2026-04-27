import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import {
  fetchLatestPaymentForms,
  fetchSalesReportRows,
  type ReportReceiptRow,
  getCurrentYearRange,
  getReceiptCidadeNome,
  getReceiptProductDescriptor,
  getVendaClienteNome,
  getVendaCodigo,
  getVendaDestino,
  getVendaStatus,
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
import { fetchCommissionContext, resolveVendaCommission } from '$lib/server/comissoes';
import { fetchAndComputeVendasKpis } from '$lib/server/vendas-kpis';

type PagamentoNaoComissionavelInput = {
  venda_id?: string | null;
  venda_recibo_id?: string | null;
  valor_total?: number | null;
  valor_bruto?: number | null;
  desconto_valor?: number | null;
  paga_comissao?: boolean | null;
  forma_nome?: string | null;
  operacao?: string | null;
  plano?: string | null;
  forma?: { nome?: string | null; paga_comissao?: boolean | null } | null;
};

type PagamentosNaoComissionaveisResumo = {
  porVenda: Map<string, number>;
  porVendaSemRecibo: Map<string, number>;
  porRecibo: Map<string, number>;
};

const DEFAULT_NAO_COMISSIONAVEIS = [
  'credito diversos',
  'credito pax',
  'credito passageiro',
  'credito de viagem',
  'credipax',
  'vale viagem',
  'carta de credito',
  'ficha cvc',
  'cvc ficha',
  'credito'
];

function toNum(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function toStr(value?: unknown) {
  return String(value || '').trim();
}

function normalizeTextValue(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function hasConciliacaoOverride(recibo?: ReportReceiptRow | null) {
  return (
    recibo?.valor_bruto_override != null ||
    recibo?.valor_liquido_override != null ||
    recibo?.valor_meta_override != null ||
    Boolean(recibo?.faixa_comissao) ||
    recibo?.percentual_comissao_loja != null
  );
}

function getReciboBrutoExibicao(recibo?: ReportReceiptRow | null) {
  if (!recibo) return 0;
  if (hasConciliacaoOverride(recibo) && recibo.valor_bruto_override != null) {
    return Math.max(0, toNum(recibo.valor_bruto_override));
  }
  return Math.max(0, toNum(recibo.valor_total));
}

function getReciboTaxasExibicao(recibo?: ReportReceiptRow | null) {
  if (!recibo) return 0;
  if (hasConciliacaoOverride(recibo)) {
    return Math.max(0, toNum(recibo.valor_taxas));
  }
  return Math.max(0, toNum(recibo.valor_taxas) - toNum(recibo.valor_du));
}

function isFormaNaoComissionavel(nome?: string | null, termos?: string[] | null) {
  const normalized = normalizeTextValue(nome);
  if (!normalized) return false;
  if (normalized.includes('cartao') && normalized.includes('credito')) return false;
  return (termos || []).some((termo) => termo && normalized.includes(termo));
}

function calcularValorPagamento(pagamento: PagamentoNaoComissionavelInput) {
  const total = toNum(pagamento.valor_total);
  if (total > 0) return total;
  const bruto = toNum(pagamento.valor_bruto);
  const desconto = toNum(pagamento.desconto_valor);
  if (bruto > 0) return Math.max(0, bruto - desconto);
  return 0;
}

function addToMap(map: Map<string, number>, key: string, value: number) {
  if (!key || value <= 0) return;
  map.set(key, (map.get(key) || 0) + value);
}

function calcularNaoComissionavelResumo(
  pagamentos: PagamentoNaoComissionavelInput[],
  termos?: string[] | null
): PagamentosNaoComissionaveisResumo {
  const porVenda = new Map<string, number>();
  const porVendaSemRecibo = new Map<string, number>();
  const porRecibo = new Map<string, number>();

  pagamentos.forEach((pagamento) => {
    const vendaId = toStr(pagamento.venda_id);
    if (!vendaId) return;

    const formaNomeResolvida = [pagamento.forma_nome, pagamento.forma?.nome, pagamento.operacao, pagamento.plano]
      .filter(Boolean)
      .join(' ');
    const pagaComissaoResolvido = pagamento.paga_comissao ?? pagamento.forma?.paga_comissao ?? null;
    const naoComissiona =
      pagaComissaoResolvido === false || isFormaNaoComissionavel(formaNomeResolvida, termos);
    if (!naoComissiona) return;

    const valorBase = calcularValorPagamento(pagamento);
    if (valorBase <= 0) return;

    addToMap(porVenda, vendaId, valorBase);

    const vendaReciboId = toStr(pagamento.venda_recibo_id);
    if (vendaReciboId) {
      addToMap(porRecibo, vendaReciboId, valorBase);
    } else {
      addToMap(porVendaSemRecibo, vendaId, valorBase);
    }
  });

  return { porVenda, porVendaSemRecibo, porRecibo };
}

async function carregarTermosNaoComissionaveis(client: any) {
  try {
    const { data, error } = await client
      .from('parametros_pagamentos_nao_comissionaveis')
      .select('termo, termo_normalizado, ativo')
      .eq('ativo', true)
      .order('termo', { ascending: true });
    if (error) throw error;

    const termos = (data || [])
      .map((row: any) => normalizeTextValue(row?.termo_normalizado || row?.termo))
      .filter(Boolean);

    const unique = Array.from(new Set(termos)) as string[];
    if (unique.length > 0) return unique;
  } catch (error) {
    console.warn('[relatorios/vendas] falha ao carregar termos nao comissionaveis', error);
  }

  return DEFAULT_NAO_COMISSIONAVEIS.map((termo) => normalizeTextValue(termo)).filter(Boolean);
}

async function fetchNaoComissionadoPorVenda(client: any, vendaIds: string[]) {
  if (vendaIds.length === 0) {
    return {
      porVenda: new Map<string, number>(),
      porVendaSemRecibo: new Map<string, number>(),
      porRecibo: new Map<string, number>()
    };
  }

  const pagamentos: PagamentoNaoComissionavelInput[] = [];
  for (let index = 0; index < vendaIds.length; index += 200) {
    const chunk = vendaIds.slice(index, index + 200);
    const { data, error } = await client
      .from('vendas_pagamentos')
      .select(
        'venda_id, venda_recibo_id, forma_nome, operacao, plano, valor_total, valor_bruto, desconto_valor, paga_comissao, forma:formas_pagamento(nome, paga_comissao)'
      )
      .in('venda_id', chunk);

    if (error) throw error;
    pagamentos.push(...((data || []) as PagamentoNaoComissionavelInput[]));
  }

  const termos = await carregarTermosNaoComissionaveis(client);
  return calcularNaoComissionavelResumo(pagamentos, termos);
}

function getRecibosAtivos(row: any) {
  const recibos = Array.isArray(row?.recibos) ? row.recibos : Array.isArray(row?.vendas_recibos) ? row.vendas_recibos : [];
  return recibos.filter((recibo: any) => !recibo?.cancelado_por_conciliacao_em);
}

function getVendaValorExibicao(row: any) {
  const recibos = getRecibosAtivos(row);
  if (recibos.length === 0) return 0;
  return Number(
    recibos
      .reduce((sum: number, recibo: ReportReceiptRow) => sum + getReciboBrutoExibicao(recibo), 0)
      .toFixed(2)
  );
}

function getVendaTaxasExibicao(row: any) {
  const recibos = getRecibosAtivos(row);
  if (recibos.length === 0) return 0;
  return Number(
    recibos
      .reduce((sum: number, recibo: ReportReceiptRow) => sum + getReciboTaxasExibicao(recibo), 0)
      .toFixed(2)
  );
}

function getLastSixMonthBuckets(referenceIso: string) {
  const reference = new Date(`${referenceIso}T12:00:00`);
  return Array.from({ length: 6 }, (_, index) => {
    const current = new Date(reference.getFullYear(), reference.getMonth() - (5 - index), 1);
    const start = new Date(current.getFullYear(), current.getMonth(), 1);
    const isReferenceMonth =
      current.getFullYear() === reference.getFullYear() && current.getMonth() === reference.getMonth();
    const end = isReferenceMonth
      ? new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
      : new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const month = String(current.getMonth() + 1).padStart(2, '0');
    return {
      key: `${current.getFullYear()}-${month}`,
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10)
    };
  });
}

function getCurrentMonthDayBuckets(referenceIso: string) {
  const reference = new Date(`${referenceIso}T12:00:00`);
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1).toISOString().slice(0, 10);
    return {
      date,
      day: index + 1
    };
  });
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['relatorios', 'vendas'], 1, 'Sem acesso ao relatorio de vendas.');
    }

    const { searchParams } = event.url;
    const defaultRange = getCurrentYearRange();
    const hasDataInicio = Boolean(searchParams.get('data_inicio'));
    const hasDataFim = Boolean(searchParams.get('data_fim'));
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = today.toISOString().slice(0, 10);
    const vendedorDefaultRange = scope.isVendedor || scope.usoIndividual;

    const dataInicio = String(
      searchParams.get('data_inicio') ||
        (vendedorDefaultRange ? monthStart : defaultRange.dataInicio)
    ).trim();
    const dataFim = String(
      searchParams.get('data_fim') ||
        (vendedorDefaultRange ? monthEnd : defaultRange.dataFim)
    ).trim();
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id'));
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      searchParams.get('vendedor_ids') || searchParams.get('vendedor_id')
    );
    const statusFilter = String(searchParams.get('status') || '').trim().toLowerCase();
    const clienteId = String(searchParams.get('cliente_id') || '').trim();
    const destinoFilter = String(searchParams.get('destino') || '').trim().toLowerCase();
    const produtoFilter = String(searchParams.get('produto') || '').trim().toLowerCase();
    const tipoProdutoFilter = String(searchParams.get('tipo_produto') || '').trim().toLowerCase();
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
      if (!parametrosError) {
        conciliacaoSobrepoeVendas = (parametrosRows || []).some((row: any) =>
          Boolean(row?.conciliacao_sobrepoe_vendas)
        );
      }
    }

    const mergeRowsById = (baseRows: any[], extraRows: any[]) => {
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

    const toRecibosView = (row: any) => {
      if (Array.isArray(row?.vendas_recibos)) return row.vendas_recibos;
      if (Array.isArray(row?.recibos)) return row.recibos;
      return [];
    };

    const loadRowsViewForPeriod = async (periodStart: string, periodEnd: string) => {
      let rows = toRateioShape(
        await fetchSalesReportRows(client, {
          dataInicio: periodStart,
          dataFim: periodEnd,
          companyIds,
          vendedorIds,
          includeCancelled: true
        })
      );

      if (vendedorIds.length > 0) {
        let splitSaleIds: string[] = [];
        try {
          splitSaleIds = await fetchSplitSaleIdsForDestinationVendedores(client, {
            companyId: companyIds[0] || null,
            companyIds,
            vendedorIds
          });
        } catch (error) {
          console.warn('[relatorios/vendas] split sales indisponivel, seguindo sem rateio destino:', error);
        }

        if (splitSaleIds.length > 0) {
          const splitRows = toRateioShape(
            await fetchSalesReportRows(client, {
              dataInicio: periodStart,
              dataFim: periodEnd,
              companyIds,
              vendaIds: splitSaleIds,
              includeCancelled: true
            })
          );
          rows = mergeRowsById(rows, splitRows);
        }
      }

      let concReceipts: any[] = [];
      try {
        concReceipts = await fetchEffectiveConciliacaoReceipts({
          client,
          companyId: companyIds[0] || null,
          companyIds,
          inicio: periodStart,
          fim: periodEnd,
          vendedorIds,
          excludeVendedorIds: undefined
        });
      } catch (error) {
        console.warn('[relatorios/vendas] conciliacao indisponivel, seguindo sem overrides:', error);
        concReceipts = [];
      }

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
        if (splitConcErr) {
          console.warn('[relatorios/vendas] split conciliation indisponivel:', splitConcErr);
        }

        const splitConcIdSet = new Set(
          ((splitConcRows as any[]) || [])
            .map((row: any) => String(row?.conciliacao_recibo_id || '').trim())
            .filter(Boolean)
        );

        if (splitConcIdSet.size > 0) {
          let concAll: any[] = [];
          try {
            concAll = await fetchEffectiveConciliacaoReceipts({
              client,
              companyId: companyIds[0] || null,
              companyIds,
              inicio: periodStart,
              fim: periodEnd,
              vendedorIds: null,
              excludeVendedorIds: undefined
            });
          } catch (error) {
            console.warn('[relatorios/vendas] conciliation all indisponivel:', error);
            concAll = [];
          }

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

      const baseRows = rows
        .map((row: any) => {
          const recibos = Array.isArray(row?.vendas_recibos) ? row.vendas_recibos : [];
          const withoutOverridden = conciliacaoSobrepoeVendas
            ? recibos.filter(
                (recibo: any) => !overriddenReceiptIds.has(String(recibo?.id || '').trim())
              )
            : recibos;

          return {
            ...row,
            vendas_recibos: filterRecibosCanceladosMesmoMes(withoutOverridden)
          };
        })
        .filter((row: any) => Array.isArray(row?.vendas_recibos) && row.vendas_recibos.length > 0);

      const mergedRows =
        concReceipts.length > 0
          ? [...baseRows, ...buildConciliacaoSyntheticVendas(concReceipts)]
          : baseRows;

      if (mergedRows.length === 0) {
        return [] as any[];
      }

      try {
        const reciboIds = mergedRows
          .flatMap((row: any) => (Array.isArray(row?.vendas_recibos) ? row.vendas_recibos : []))
          .map((recibo: any) => String(recibo?.id || '').trim())
          .filter(Boolean);
        const rateioMap = await fetchRateioByReciboIds(client, reciboIds);
        rows = applyRateioToSalesForScopedVendedores(mergedRows, rateioMap, vendedorIds);
      } catch (error) {
        console.warn('[relatorios/vendas] rateio indisponivel, seguindo sem rateio:', error);
        rows = mergedRows;
      }

      return rows.map((row: any) => ({
        ...row,
        recibos: toRecibosView(row)
      }));
    };

    const filterRowsForReport = (rowsInput: any[]) =>
      rowsInput.filter((row) => {
        if (clienteId && String(row.cliente_id || '').trim() !== clienteId) {
          return false;
        }

        const destino = getVendaDestino(row).toLowerCase();
        if (destinoFilter && !destino.includes(destinoFilter)) {
          return false;
        }

        if (produtoFilter || tipoProdutoFilter) {
          const recibos = Array.isArray(row.recibos) && row.recibos.length > 0 ? row.recibos : [null];
          const matches = recibos.some((recibo: ReportReceiptRow) => {
            const descriptor = getReceiptProductDescriptor(recibo, row);
            const produtoMatches = !produtoFilter || descriptor.produto.toLowerCase().includes(produtoFilter);
            const tipoMatches = !tipoProdutoFilter || descriptor.tipo.toLowerCase().includes(tipoProdutoFilter);
            return produtoMatches && tipoMatches;
          });

          if (!matches) {
            return false;
          }
        }

        return true;
      });

    const loadConsultaRowsForPeriod = async (periodStart: string, periodEnd: string) => {
      let query = client
        .from('vendas')
        .select(`
          id,
          numero_venda,
          vendedor_id,
          cliente_id,
          company_id,
          data_venda,
          data_embarque,
          data_final,
          valor_total,
          valor_total_bruto,
          valor_taxas,
          cancelada,
          clientes (nome, whatsapp),
          vendedor:users!vendedor_id (nome_completo),
          destino_cidade:cidades!destino_cidade_id (id, nome),
          destinos:produtos!destino_id (nome, cidade_id),
          recibos:vendas_recibos (
            id,
            numero_recibo,
            numero_reserva,
            destino_cidade:cidades!destino_cidade_id (id, nome),
            tipo_pacote,
            valor_total,
            valor_taxas,
            valor_du,
            valor_rav,
            data_inicio,
            data_fim,
            tipo_produtos (id, nome, tipo),
            produto_resolvido:produtos!produto_resolvido_id (id, nome)
          )
        `)
        .order('data_venda', { ascending: false })
        .limit(5000);

      if (periodStart) query = query.gte('data_venda', periodStart);
      if (periodEnd) query = query.lte('data_venda', periodEnd);
      if (companyIds.length > 0) query = query.in('company_id', companyIds);
      if (vendedorIds.length > 0) query = query.in('vendedor_id', vendedorIds);
      if (clienteId) query = query.eq('cliente_id', clienteId);
      else if (!scope.isAdmin && accessibleClientIds.length > 0) query = query.in('cliente_id', accessibleClientIds);

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as any[]).map((row) => ({
        ...row,
        recibos: Array.isArray(row?.recibos) ? row.recibos : []
      }));
    };

    const computeConsultaKpiTotalFromRows = (rowsInput: any[]) => {
      const filtered = filterRowsForReport(rowsInput);
      let total = 0;

      filtered.forEach((row) => {
        const status = getVendaStatus(row);
        if (statusFilter && status !== statusFilter) {
          return;
        }

        const recibos = Array.isArray(row?.recibos) ? row.recibos : [];
        if (recibos.length > 0) {
          total += recibos.reduce((sum: number, recibo: any) => sum + Number(recibo?.valor_total || 0), 0);
          return;
        }

        total += Number(row?.valor_total || 0);
      });

      return Number(total.toFixed(2));
    };

    const rowsView = await loadRowsViewForPeriod(dataInicio, dataFim);

    const naoComissionadoPorVenda = await fetchNaoComissionadoPorVenda(
      client,
      rowsView.map((row) => toStr(row?.id)).filter(Boolean)
    );

    // Determina o período para busca de metas (primeiro dia do mês de dataInicio)
    const periodoMeta = dataInicio ? dataInicio.slice(0, 7) + '-01' : '';

    const commissionContext = await fetchCommissionContext(client, {
      companyIds,
      vendedorIds,
      periodo: periodoMeta,
      rows: rowsView
    });

    const paymentForms = await fetchLatestPaymentForms(
      client,
      rowsView.map((row) => row.id)
    );

    const filteredRows = filterRowsForReport(rowsView);

    let items = filteredRows.map((row) => {
      const status = getVendaStatus(row);
      const receiptRows = getRecibosAtivos(row);
      const vendaId = toStr(row?.id);
      const somaBrutoRecibos = receiptRows.reduce(
        (sum: number, recibo: ReportReceiptRow) => sum + getReciboBrutoExibicao(recibo),
        0
      );
      const linkedNaoComissionado = toNum(naoComissionadoPorVenda.porVenda.get(vendaId) || 0);
      const naoComissionadoSemRecibo = toNum(naoComissionadoPorVenda.porVendaSemRecibo.get(vendaId) || 0);
      const usarModoPorRecibo = linkedNaoComissionado > 0 && naoComissionadoSemRecibo <= 0;
      const fatorComissionavel =
        !usarModoPorRecibo && somaBrutoRecibos > 0
          ? Math.max(0, Math.min(1, (somaBrutoRecibos - linkedNaoComissionado) / somaBrutoRecibos))
          : 1;

      const recibos = receiptRows.map((recibo: any) => {
        const descriptor = getReceiptProductDescriptor(recibo, row);
        const brutoBase = getReciboBrutoExibicao(recibo);
        const naoComissionadoRecibo =
          usarModoPorRecibo && toStr(recibo?.id)
            ? toNum(naoComissionadoPorVenda.porRecibo.get(toStr(recibo.id)) || 0)
            : 0;
        const valorComissionavel = usarModoPorRecibo
          ? Math.max(0, brutoBase - naoComissionadoRecibo)
          : brutoBase * fatorComissionavel;
        const commissionByReceipt = resolveVendaCommission(
          {
            ...row,
            desconto_comercial_valor: 0,
            valor_total_bruto: brutoBase,
            valor_total_pago: brutoBase,
            valor_nao_comissionado: Math.max(0, brutoBase - valorComissionavel),
            recibos: [{ ...recibo }]
          },
          commissionContext
        );

        return {
          id: recibo?.id || null,
          numero_recibo: recibo?.numero_recibo || null,
          recibo_display: recibo?.numero_recibo || null,
          numero_recibo_normalizado: recibo?.numero_recibo_normalizado ?? null,
          recibo_short: String(recibo?.numero_recibo ?? '').slice(0, 8),
          data_venda: recibo?.data_venda || row.data_venda,
          produto_id: recibo?.produto_id || null,
          tipo_produto: descriptor.tipo,
          produto_nome: descriptor.produto,
          cidade_nome: getReceiptCidadeNome(recibo, row),
          valor_total: brutoBase,
          valor_taxas: getReciboTaxasExibicao(recibo),
          valor_du: Number(recibo?.valor_du || 0),
          valor_rav: Number(recibo?.valor_rav || 0),
          percentual_comissao_loja: Number(recibo?.percentual_comissao_loja || 0),
          faixa_comissao: recibo?.faixa_comissao || null,
          valor_comissao_loja: Number(recibo?.valor_comissao_loja || 0),
          valor_bruto_override: recibo?.valor_bruto_override ?? null,
          valor_liquido_override: recibo?.valor_liquido_override ?? null,
          valor_meta_override: recibo?.valor_meta_override ?? null,
          valor_comissionavel: valorComissionavel,
          // Quando o motor de regras não encontra regra aplicável (valor = 0),
          // usa valor_comissao_loja da conciliação como fallback — espelha o
          // comportamento do vtur-app que usa o valor real informado pela operadora.
          valor_comissao_calculada:
            commissionByReceipt.valorComissao > 0
              ? commissionByReceipt.valorComissao
              : Number(recibo?.valor_comissao_loja || 0),
          // Quando o motor de regras não encontra regra aplicável (percentual = 0),
          // usa percentual_comissao_loja da conciliação como fallback — espelha o
          // comportamento do vtur-app que exibe o percentual real informado pela operadora.
          percentual_comissao_calculado:
            commissionByReceipt.percentual > 0
              ? commissionByReceipt.percentual
              : Number(recibo?.percentual_comissao_loja || 0)
        };
      });
      const commission = {
        valorComissao: roundToMoney(
          recibos.reduce(
            (sum: number, recibo: { valor_comissao_calculada?: number | null }) =>
              sum + toNum(recibo.valor_comissao_calculada),
            0
          )
        )
      };

      return {
        id: row.id,
        numero_venda: row.numero_venda,
        codigo: getVendaCodigo(row),
        data_venda: row.data_venda,
        data_embarque: row.data_embarque,
        data_final: row.data_final,
        cliente_id: row.cliente_id,
        cliente_nome: getVendaClienteNome(row),
        cliente_cpf: (row.clientes as any)?.cpf || null,
        vendedor_id: row.vendedor_id,
        vendedor_nome: getVendaVendedorNome(row),
        destino_id: (row.destinos as any)?.id || null,
        destino_nome: getVendaDestino(row),
        destino_cidade_id: (row.destino_cidade as any)?.id || null,
        destino_cidade_nome: (row.destino_cidade as any)?.nome || null,
        valor_total: Number(
          recibos
            .reduce((sum: number, recibo: { valor_comissionavel?: number | null }) => sum + toNum(recibo.valor_comissionavel), 0)
            .toFixed(2)
        ),
        valor_taxas: Number(
          recibos.reduce((sum: number, recibo: { valor_total?: number | null; valor_taxas?: number | null; valor_comissionavel?: number | null }) => {
            const bruto = Math.max(0, toNum(recibo.valor_total));
            const fator = bruto > 0 ? Math.max(0, Math.min(1, toNum(recibo.valor_comissionavel) / bruto)) : 0;
            return sum + toNum(recibo.valor_taxas) * fator;
          }, 0).toFixed(2)
        ),
        cancelada: row.cancelada || false,
        status,
        forma_pagamento: paymentForms.get(row.id) || 'Nao informado',
        recibos,
        // KPIs por venda
        comissao: commission.valorComissao,
        vendas_recibos: row.recibos
      };
    });

    if (statusFilter) {
      items = items.filter((item) => item.status === statusFilter);
    }

    const vendedores = Array.from(
      new Map(
        filteredRows
          .filter((row) => row.vendedor_id)
          .map((row) => [row.vendedor_id as string, getVendaVendedorNome(row)])
      ).entries()
    )
      .map(([id, nome]) => ({ id, nome }))
      .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));

    const sharedKpis = await fetchAndComputeVendasKpis(client, {
      dataInicio,
      dataFim,
      companyIds,
      vendedorIds,
      accessibleClientIds
    });

    const historyBuckets = getLastSixMonthBuckets(dataFim);
    const dayBuckets = getCurrentMonthDayBuckets(dataFim);

    const [monthlySeries, dailySeries] = await Promise.all([
      Promise.all(
        historyBuckets.map(async (bucket) => {
          const bucketKpis = await fetchAndComputeVendasKpis(client, {
            dataInicio: bucket.start,
            dataFim: bucket.end,
            companyIds,
            vendedorIds,
            accessibleClientIds
          });

          return {
            key: bucket.key,
            total_valor: Number(bucketKpis.totalVendas || 0)
          };
        })
      ),
      Promise.all(
        dayBuckets.map(async (bucket) => {
          if (bucket.date > dataFim) {
            return { date: bucket.date, value: 0 };
          }

          const bucketKpis = await fetchAndComputeVendasKpis(client, {
            dataInicio: bucket.date,
            dataFim: bucket.date,
            companyIds,
            vendedorIds,
            accessibleClientIds
          });

          return {
            date: bucket.date,
            value: Number(bucketKpis.totalVendas || 0)
          };
        })
      )
    ]);

    // KPIs agregados
    const totalVendas = items.length;
    const vendasConfirmadas = items.filter(i => i.status === 'confirmada').length;
    const vendasCanceladas = items.filter(i => i.status === 'cancelada').length;
    const totalValor = Number(sharedKpis.totalVendas || 0);
    const totalComissao = items.reduce((sum, item) => sum + Number(item.comissao || 0), 0);
    const ticketMedio = totalVendas > 0 ? totalValor / totalVendas : 0;

    return json({
      items,
      total: items.length,
      vendedores,
      resumo: {
        total_vendas: totalVendas,
        vendas_confirmadas: vendasConfirmadas,
        vendas_canceladas: vendasCanceladas,
        total_valor: totalValor,
        total_comissao: totalComissao,
        ticket_medio: ticketMedio
      },
      series: {
        mensal: monthlySeries.map((item) => ({
          key: item.key,
          total_valor: Number(item.total_valor.toFixed(2))
        })),
        diaria: dailySeries.map((item) => ({
          date: item.date,
          value: Number(item.value.toFixed(2))
        }))
      },
      periodo: {
        data_inicio: dataInicio,
        data_fim: dataFim
      }
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar relatorio de vendas.');
  }
}

function roundToMoney(value: number) {
  return Number(value.toFixed(2));
}
