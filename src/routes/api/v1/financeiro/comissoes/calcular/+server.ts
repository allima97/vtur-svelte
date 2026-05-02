import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { resolveGroupedReceiptCommissions } from '$lib/server/comissoes';
import { applyPersistedComissao, buildPersistedReciboComissaoKey, fetchPersistedComissoes } from '$lib/server/comissoes-registro';
import { fetchSalesReportRows, getVendaClienteNome, getVendaVendedorNome } from '$lib/server/relatorios';
import { monthRangeFromYearMonth, parseISODateParts, todayISODateLocal } from '$lib/date';

function toNum(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function scaleCommissionPart(part: number, calculatedTotal: number, appliedTotal: number) {
  const total = toNum(calculatedTotal);
  const applied = toNum(appliedTotal);
  if (total <= 0 || applied <= 0) return 0;
  return roundMoney((toNum(part) / total) * applied);
}

function getReciboValor(recibo: any) {
  return Math.max(0, toNum(recibo?.valor_total) - toNum(recibo?.valor_rav));
}

function getReciboCodigo(recibo: any) {
  return String(recibo?.numero_recibo || recibo?.numero_reserva || '').trim();
}

function getReciboProduto(recibo: any) {
  return String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || 'Produto sem nome');
}

function normalizeRowsToReceiptPeriod(rows: any[]) {
  return (rows || []).map((row) => {
    const recibos = Array.isArray(row?.recibos) ? row.recibos : [];
    const firstReceiptDate = recibos.find((recibo: any) => recibo?.data_venda)?.data_venda;
    return firstReceiptDate ? { ...row, data_venda: firstReceiptDate } : row;
  });
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Comissionamento', 'financeiro'], 2, 'Sem permissão para calcular comissões.');
    }

    const body = await event.request.json();
    const { venda_ids, vendedor_ids, data_inicio, data_fim, mes_referencia, ano_referencia } = body;

    const hoje = parseISODateParts(todayISODateLocal());
    const mesRef = mes_referencia || hoje?.month || new Date().getMonth() + 1;
    const anoRef = ano_referencia || hoje?.year || new Date().getFullYear();

    const companyIds = resolveScopedCompanyIds(scope, body?.empresa_id || body?.company_id);
    const vendedorIds = await resolveScopedVendedorIds(client, scope, vendedor_ids);
    const vendasPeriodo = await fetchSalesReportRows(client, {
      dataInicio: data_inicio,
      dataFim: data_fim,
      companyIds,
      vendedorIds,
      filterByReceiptDate: Boolean(data_inicio || data_fim)
    });
    let vendas = normalizeRowsToReceiptPeriod(vendasPeriodo);

    if (Array.isArray(venda_ids) && venda_ids.length > 0) {
      const allowedIds = new Set(venda_ids.map((id: string) => String(id)));
      vendas = vendas.filter((venda) => allowedIds.has(String(venda.id)));
    }

    if (!vendas || vendas.length === 0) {
      return json({ success: true, message: 'Nenhum recibo encontrado', processadas: 0, erro: 0, detalhes: [] });
    }
    const resolvedByReceiptId = await resolveGroupedReceiptCommissions(client, {
      companyIds,
      rows: normalizeRowsToReceiptPeriod(vendasPeriodo) as any
    });

    const resultados: any[] = [];
    let processadas = 0;

    for (const venda of vendas as any[]) {
      for (const recibo of Array.isArray(venda.recibos) ? venda.recibos : []) {
        const reciboId = String(recibo?.id || '').trim();
        const resolved = reciboId ? resolvedByReceiptId.get(reciboId) : undefined;
        if (!resolved) {
          resultados.push({ venda_id: venda.id, recibo_id: reciboId, numero_venda: venda.numero_venda, numero_recibo: getReciboCodigo(recibo), status: 'ignorada', motivo: 'Comissão não resolvida para o recibo' });
          continue;
        }

        if (resolved.valorComissionavel <= 0) {
          resultados.push({ venda_id: venda.id, recibo_id: reciboId, numero_venda: venda.numero_venda, numero_recibo: getReciboCodigo(recibo), status: 'ignorada', motivo: 'Valor comissionável é zero' });
          continue;
        }

        resultados.push({
          id: reciboId,
          venda_id: venda.id,
          recibo_id: reciboId,
          numero_venda: venda.numero_venda,
          numero_recibo: getReciboCodigo(recibo),
          produto: getReciboProduto(recibo),
          cliente: getVendaClienteNome(venda),
          vendedor: getVendaVendedorNome(venda),
          valor_venda: getReciboValor(recibo),
          valor_comissionavel: resolved.valorComissionavel,
          percentual: resolved.percentual,
          percentual_comissao_geral: resolved.percentualComissaoGeral,
          percentual_seguro: resolved.percentualSeguro,
          valor_comissao: resolved.valorComissao,
          valor_comissao_geral: resolved.valorComissaoGeral,
          valor_comissao_seguro: resolved.valorComissaoSeguro,
          regra: resolved.regraNome,
          status: 'calculada',
          mes_referencia: mesRef,
          ano_referencia: anoRef
        });
        processadas++;
      }
    }

    return json({
      success: true,
      message: `${processadas} comissões calculadas`,
      processadas,
      erro: 0,
      total_recibos: processadas,
      detalhes: resultados
    });

  } catch (err) {
    console.error('[Calcular Comissões POST] Erro:', err);
    return toErrorResponse(err, 'Erro ao calcular comissões.');
  }
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Comissionamento', 'financeiro'], 1, 'Sem acesso.');
    }

    const { searchParams } = event.url;
    const vendedorId = searchParams.get('vendedor_id');
    const statusParam = String(searchParams.get('status') || '').trim().toLowerCase();
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id') || searchParams.get('company_id'));
    const mes = searchParams.get('mes');
    const ano = searchParams.get('ano');
    const vendedorIds = await resolveScopedVendedorIds(client, scope, vendedorId);

    const hojeParts = parseISODateParts(todayISODateLocal());
    const mesNum = mes ? parseInt(mes) : (hojeParts?.month || new Date().getMonth() + 1);
    const anoNum = ano ? parseInt(ano) : (hojeParts?.year || new Date().getFullYear());
    const range = monthRangeFromYearMonth(anoNum, mesNum);
    const dataInicio = range.inicio;
    const dataFim = range.fim;

    const vendas = await fetchSalesReportRows(client, {
      dataInicio,
      dataFim,
      companyIds,
      vendedorIds,
      filterByReceiptDate: true
    });
    const vendasForComissao = normalizeRowsToReceiptPeriod(vendas as any);
    const resolvedByReceiptId = await resolveGroupedReceiptCommissions(client, {
      companyIds,
      rows: vendasForComissao as any
    });
    const reciboIds = vendasForComissao
      .flatMap((v: any) => (Array.isArray(v?.recibos) ? v.recibos : []))
      .map((recibo: any) => String(recibo?.id || '').trim())
      .filter(Boolean);
    const persistedSnapshot = await fetchPersistedComissoes(client, {
      companyIds,
      vendaIds: (vendas || []).map((row) => row.id),
      reciboIds,
      vendedorIds: (vendas || []).map((row) => String(row.vendedor_id || '')).filter(Boolean)
    });
    const persistedByKey = new Map(
      persistedSnapshot.rows.map((row) => [
        buildPersistedReciboComissaoKey(row.recibo_id, row.vendedor_id, row.venda_id),
        row
      ] as const)
    );

    let items = (vendasForComissao || []).flatMap((v: any) =>
      (Array.isArray(v?.recibos) ? v.recibos : []).map((recibo: any) => {
        const reciboId = String(recibo?.id || '').trim();
        const resolved = reciboId ? resolvedByReceiptId.get(reciboId) : undefined;
        if (!resolved) return null;
        const persisted = persistedByKey.get(buildPersistedReciboComissaoKey(reciboId, v.vendedor_id, v.id));
        const persistedApplied = applyPersistedComissao(
          {
            valor_venda: getReciboValor(recibo),
            valor_comissionavel: resolved.valorComissionavel,
            percentual_aplicado: resolved.percentual,
            valor_comissao: resolved.valorComissao,
            valor_pago: 0,
            status: 'pendente'
          },
          persisted
        );
        const valorComissaoSeguro = scaleCommissionPart(
          resolved.valorComissaoSeguro,
          resolved.valorComissao,
          persistedApplied.valor_comissao
        );
        const valorComissaoGeral = roundMoney(Math.max(0, persistedApplied.valor_comissao - valorComissaoSeguro));
        return {
          id: reciboId,
          venda_id: v.id,
          recibo_id: reciboId,
          numero_venda: v.numero_venda || `VD-${v.id.slice(0, 8)}`,
          numero_recibo: getReciboCodigo(recibo) || `REC-${reciboId.slice(0, 8)}`,
          produto: getReciboProduto(recibo),
          data_venda: recibo?.data_venda || v.data_venda,
          cliente: getVendaClienteNome(v),
          vendedor_id: v.vendedor_id,
          vendedor: getVendaVendedorNome(v),
          valor_venda: persistedApplied.valor_venda,
          valor_comissionavel: persistedApplied.valor_comissionavel,
          percentual_aplicado: persistedApplied.percentual_aplicado,
          valor_comissao: persistedApplied.valor_comissao,
          percentual_comissao_geral: resolved.percentualComissaoGeral,
          percentual_seguro: resolved.percentualSeguro,
          valor_comissao_geral: valorComissaoGeral,
          valor_comissao_seguro: valorComissaoSeguro,
          valor_pago: persistedApplied.valor_pago,
          regra_nome: resolved.regraNome,
          status: persistedApplied.status.toUpperCase(),
          mes_referencia: mesNum,
          ano_referencia: anoNum,
          data_pagamento: persisted?.data_pagamento || null
        };
      })
    ).filter(Boolean) as any[];

    if (statusParam && statusParam !== 'todas') {
      items = items.filter((item: any) => String(item.status || '').toLowerCase() === statusParam);
    }

    const totalPendente = items
      .filter((item: any) => String(item.status || '').toLowerCase() !== 'paga')
      .reduce((acc: number, i: any) => acc + Number(i.valor_comissao || 0), 0);
    const totalPago = items
      .filter((item: any) => String(item.status || '').toLowerCase() === 'paga')
      .reduce((acc: number, i: any) => acc + Number(i.valor_pago || i.valor_comissao || 0), 0);

    return json({
      items,
      total: items.length,
      resumo: { total_pendente: totalPendente, total_pago: totalPago, total_geral: totalPendente + totalPago },
      persistencia_disponivel: persistedSnapshot.available
    });

  } catch (err) {
    console.error('[Comissões Calculadas GET] Erro:', err);
    return toErrorResponse(err, 'Erro ao carregar comissões.');
  }
}
