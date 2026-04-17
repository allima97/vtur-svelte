import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchGestorEquipeIdsComGestor,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

const DEFAULT_NAO_COMISSIONAVEIS = [
  'credito diversos',
  'credito pax',
  'credito passageiro',
  'credito de viagem',
  'credipax',
  'vale viagem',
  'carta de credito',
  'credito'
];

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeMoneyKey(value: number | null | undefined) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return '0.00';
  return parsed.toFixed(2);
}

function buildPagamentoKey(pagamento: any) {
  const forma = String(pagamento?.forma_nome || pagamento?.forma_pagamento_id || '')
    .toLowerCase()
    .trim();
  const totalKey = normalizeMoneyKey(
    pagamento?.valor_total != null ? pagamento.valor_total : pagamento?.valor_bruto
  );
  const parcelas = Array.isArray(pagamento?.parcelas) ? pagamento.parcelas : [];
  const parcelasKey = parcelas
    .map((parcela: any) => {
      const valor = normalizeMoneyKey(parcela?.valor);
      const vencimento = String(parcela?.vencimento || '').trim();
      return `${valor}|${vencimento}`;
    })
    .join(',');
  const parcelasQtd = pagamento?.parcelas_qtd ?? parcelas.length ?? 0;
  const pagaComissaoKey =
    pagamento?.paga_comissao === null || pagamento?.paga_comissao === undefined
      ? 'na'
      : pagamento.paga_comissao
        ? '1'
        : '0';

  return [forma, totalKey, parcelasKey, String(parcelasQtd), pagaComissaoKey].join('|');
}

function dedupePagamentos(pagamentos: any[], preferVendaId?: string) {
  const map = new Map<string, any>();
  const duplicateIds: string[] = [];

  for (const pagamento of pagamentos) {
    const key = buildPagamentoKey(pagamento);
    const current = map.get(key);

    if (!current) {
      map.set(key, pagamento);
      continue;
    }

    if (preferVendaId && pagamento?.venda_id === preferVendaId && current?.venda_id !== preferVendaId) {
      if (current?.id) duplicateIds.push(current.id);
      map.set(key, pagamento);
      continue;
    }

    if (pagamento?.id) duplicateIds.push(pagamento.id);
  }

  return {
    deduped: Array.from(map.values()),
    duplicateIds
  };
}

function calcularValorPagamento(pagamento: any) {
  const valorTotal = Number(pagamento?.valor_total || 0);
  if (valorTotal > 0) return valorTotal;

  const valorBruto = Number(pagamento?.valor_bruto || 0);
  const desconto = Number(pagamento?.desconto_valor || 0);
  if (valorBruto > 0) return Math.max(0, valorBruto - desconto);

  return 0;
}

function calcularTotalPagamentos(pagamentos: any[]) {
  return pagamentos.reduce((acc, pagamento) => acc + calcularValorPagamento(pagamento), 0);
}

async function carregarTermosNaoComissionaveis(client: any): Promise<string[]> {
  try {
    const { data, error } = await client
      .from('parametros_pagamentos_nao_comissionaveis')
      .select('termo, termo_normalizado, ativo')
      .eq('ativo', true)
      .order('termo', { ascending: true });
    if (error) throw error;

    const termos = (data || [])
      .map((row: any) => normalizeText(row?.termo_normalizado || row?.termo))
      .filter(Boolean);

    return termos.length > 0 ? Array.from(new Set(termos)) : DEFAULT_NAO_COMISSIONAVEIS.map(normalizeText);
  } catch {
    return DEFAULT_NAO_COMISSIONAVEIS.map(normalizeText);
  }
}

function isFormaNaoComissionavel(nome?: string | null, termos?: string[]) {
  const normalized = normalizeText(nome);
  if (!normalized) return false;
  if (normalized.includes('cartao') && normalized.includes('credito')) return false;
  const base = termos && termos.length > 0 ? termos : DEFAULT_NAO_COMISSIONAVEIS.map(normalizeText);
  return base.some((termo) => termo && normalized.includes(termo));
}

function parseBodyIds(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter((item) => isUuid(item));
  }
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => isUuid(item));
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 3, 'Sem permissao para editar vendas.');
    }

    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody) as {
      venda_id?: string;
      merge_ids?: unknown;
      company_id?: string;
      empresa_id?: string;
      vendedor_ids?: unknown;
    } | null;

    const vendaId = String(body?.venda_id || '').trim();
    const mergeIds = parseBodyIds(body?.merge_ids).filter((id) => id !== vendaId);

    if (!isUuid(vendaId)) {
      return new Response('venda_id invalido.', { status: 400 });
    }
    if (mergeIds.length === 0) {
      return new Response('merge_ids vazio.', { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(
      scope,
      body?.company_id || body?.empresa_id || event.url.searchParams.get('empresa_id')
    );

    let vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get('vendedor_ids') || event.url.searchParams.get('vendedor_id')
    );

    const bodyVendedorIds = parseBodyIds(body?.vendedor_ids);
    if (scope.isMaster && bodyVendedorIds.length > 0) {
      vendedorIds = bodyVendedorIds;
    }

    const saleIds = [vendaId, ...mergeIds];

    let salesQuery = client
      .from('vendas')
      .select('id, vendedor_id, desconto_comercial_aplicado, desconto_comercial_valor, data_embarque, data_final, company_id')
      .in('id', saleIds);

    if (companyIds.length > 0) salesQuery = salesQuery.in('company_id', companyIds);

    if (!scope.isAdmin && scope.isGestor) {
      const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
      if (equipeIds.length === 0) {
        return new Response('Sem vendas para mesclar.', { status: 403 });
      }
      salesQuery = salesQuery.in('vendedor_id', equipeIds);
    } else if (vendedorIds.length > 0) {
      salesQuery = salesQuery.in('vendedor_id', vendedorIds);
    }

    const { data: salesData, error: salesError } = await salesQuery;
    if (salesError) throw salesError;

    const sales = Array.isArray(salesData) ? salesData : [];
    const foundIds = new Set(sales.map((item: any) => String(item?.id || '')));
    if (saleIds.some((id) => !foundIds.has(id))) {
      return new Response('Vendas invalidas para mescla.', { status: 404 });
    }

    const { data: receiptsData, error: receiptsError } = await client
      .from('vendas_recibos')
      .select('id, venda_id, valor_total, valor_taxas, data_inicio, data_fim')
      .in('venda_id', saleIds);
    if (receiptsError) throw receiptsError;

    const { data: paymentsData, error: paymentsError } = await client
      .from('vendas_pagamentos')
      .select('id, venda_id, forma_pagamento_id, forma_nome, valor_total, valor_bruto, desconto_valor, parcelas, parcelas_qtd, parcelas_valor, paga_comissao, operacao, plano')
      .in('venda_id', saleIds);
    if (paymentsError) throw paymentsError;

    const pagamentos = Array.isArray(paymentsData) ? paymentsData : [];
    const { deduped, duplicateIds } = dedupePagamentos(pagamentos, vendaId);

    if (duplicateIds.length > 0) {
      const { error: deleteDuplicatePaymentsError } = await client
        .from('vendas_pagamentos')
        .delete()
        .in('id', duplicateIds);
      if (deleteDuplicatePaymentsError) throw deleteDuplicatePaymentsError;
    }

    if (mergeIds.length > 0) {
      const { error: updatePaymentsError } = await client
        .from('vendas_pagamentos')
        .update({ venda_id: vendaId })
        .in('venda_id', mergeIds);
      if (updatePaymentsError) throw updatePaymentsError;

      const { error: updateReceiptNotesError } = await client
        .from('vendas_recibos_notas')
        .update({ venda_id: vendaId })
        .in('venda_id', mergeIds);
      if (updateReceiptNotesError && String(updateReceiptNotesError.code || '') !== '42P01') {
        throw updateReceiptNotesError;
      }

      const { error: updateReceiptsError } = await client
        .from('vendas_recibos')
        .update({ venda_id: vendaId })
        .in('venda_id', mergeIds);
      if (updateReceiptsError) throw updateReceiptsError;

      const { error: updateTripsError } = await client
        .from('viagens')
        .update({ venda_id: vendaId })
        .in('venda_id', mergeIds);
      if (updateTripsError && String(updateTripsError.code || '') !== '42P01') {
        throw updateTripsError;
      }

      let deleteMergedSalesQuery = client.from('vendas').delete().in('id', mergeIds);
      if (companyIds.length > 0) deleteMergedSalesQuery = deleteMergedSalesQuery.in('company_id', companyIds);
      if (vendedorIds.length > 0) deleteMergedSalesQuery = deleteMergedSalesQuery.in('vendedor_id', vendedorIds);
      const { error: deleteMergedSalesError } = await deleteMergedSalesQuery;
      if (deleteMergedSalesError) throw deleteMergedSalesError;
    }

    const receipts = Array.isArray(receiptsData) ? receiptsData : [];
    const totalBrutoRecibos = receipts.reduce((acc: number, item: any) => acc + Number(item?.valor_total || 0), 0);
    const totalTaxasRecibos = receipts.reduce((acc: number, item: any) => acc + Number(item?.valor_taxas || 0), 0);
    const totalPago = calcularTotalPagamentos(deduped);
    const totalPagoFinal = totalPago > 0 ? totalPago : totalBrutoRecibos;
    const termosNaoComissionaveis = await carregarTermosNaoComissionaveis(client);
    const valorNaoComissionado = deduped.reduce((acc: number, pagamento: any) => {
      const naoComissiona =
        pagamento?.paga_comissao === false ||
        isFormaNaoComissionavel(pagamento?.forma_nome, termosNaoComissionaveis);
      return naoComissiona ? acc + calcularValorPagamento(pagamento) : acc;
    }, 0);
    const valorComissionavel =
      totalPagoFinal > 0 ? Math.max(0, totalPagoFinal - valorNaoComissionado) : 0;

    const descontoTotal = sales.reduce(
      (acc: number, item: any) => acc + Number(item?.desconto_comercial_valor || 0),
      0
    );
    const principalSale = sales.find((item: any) => item?.id === vendaId);
    const dataEmbarque =
      receipts
        .map((item: any) => String(item?.data_inicio || '').trim())
        .filter(Boolean)
        .sort()[0] || principalSale?.data_embarque || null;
    const datasFim = receipts
      .map((item: any) => String(item?.data_fim || '').trim())
      .filter(Boolean)
      .sort();
    const dataFinal = datasFim.length > 0 ? datasFim[datasFim.length - 1] : principalSale?.data_final || null;

    let updateSaleQuery = client
      .from('vendas')
      .update({
        valor_total_bruto: totalBrutoRecibos || null,
        valor_total_pago: totalPagoFinal || null,
        valor_taxas: totalTaxasRecibos || null,
        valor_nao_comissionado: valorNaoComissionado || null,
        valor_total: valorComissionavel || null,
        desconto_comercial_aplicado: descontoTotal > 0,
        desconto_comercial_valor: descontoTotal || null,
        data_embarque: dataEmbarque,
        data_final: dataFinal
      })
      .eq('id', vendaId);

    if (companyIds.length > 0) updateSaleQuery = updateSaleQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) updateSaleQuery = updateSaleQuery.in('vendedor_id', vendedorIds);

    const { error: updateSaleError } = await updateSaleQuery;
    if (updateSaleError) throw updateSaleError;

    return json({
      ok: true,
      removed_pagamentos: duplicateIds.length,
      total_bruto: totalBrutoRecibos,
      total_taxas: totalTaxasRecibos
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao mesclar vendas.');
  }
}
