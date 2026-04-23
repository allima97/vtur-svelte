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
import { fetchCommissionContext, resolveVendaCommission } from '$lib/server/comissoes';
import { applyPersistedComissao, buildPersistedComissaoKey, fetchPersistedComissoes } from '$lib/server/comissoes-registro';
import { fetchSalesReportRows, getVendaClienteNome, getVendaVendedorNome } from '$lib/server/relatorios';

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro', 'comissoes'], 2, 'Sem permissão para calcular comissões.');
    }

    const body = await event.request.json();
    const { venda_ids, vendedor_ids, data_inicio, data_fim, mes_referencia, ano_referencia } = body;

    const hoje = new Date();
    const mesRef = mes_referencia || hoje.getMonth() + 1;
    const anoRef = ano_referencia || hoje.getFullYear();

    const companyIds = resolveScopedCompanyIds(scope, body?.empresa_id || body?.company_id);
    const vendedorIds = await resolveScopedVendedorIds(client, scope, vendedor_ids);
    let vendas = await fetchSalesReportRows(client, {
      dataInicio: data_inicio,
      dataFim: data_fim,
      companyIds,
      vendedorIds
    });

    if (Array.isArray(venda_ids) && venda_ids.length > 0) {
      const allowedIds = new Set(venda_ids.map((id: string) => String(id)));
      vendas = vendas.filter((venda) => allowedIds.has(String(venda.id)));
    }

    if (!vendas || vendas.length === 0) {
      return json({ success: true, message: 'Nenhuma venda encontrada', processadas: 0, erro: 0, detalhes: [] });
    }
    const commissionContext = await fetchCommissionContext(client, { companyIds, rows: vendas as any });

    const resultados: any[] = [];
    let processadas = 0;

    for (const venda of vendas as any[]) {
      const resolved = resolveVendaCommission(venda, commissionContext);

      if (resolved.valorComissionavel <= 0) {
        resultados.push({ venda_id: venda.id, numero_venda: venda.numero_venda, status: 'ignorada', motivo: 'Valor comissionável é zero' });
        continue;
      }

      resultados.push({
        venda_id: venda.id,
        numero_venda: venda.numero_venda,
        cliente: getVendaClienteNome(venda),
        vendedor: getVendaVendedorNome(venda),
        valor_venda: resolved.valorVenda,
        valor_comissionavel: resolved.valorComissionavel,
        percentual: resolved.percentual,
        valor_comissao: resolved.valorComissao,
        regra: resolved.regraNome,
        status: 'calculada',
        mes_referencia: mesRef,
        ano_referencia: anoRef
      });
      processadas++;
    }

    return json({
      success: true,
      message: `${processadas} comissões calculadas`,
      processadas,
      erro: 0,
      total_vendas: vendas.length,
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
      ensureModuloAccess(scope, ['financeiro', 'comissoes'], 1, 'Sem acesso.');
    }

    const { searchParams } = event.url;
    const vendedorId = searchParams.get('vendedor_id');
    const statusParam = String(searchParams.get('status') || '').trim().toLowerCase();
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id') || searchParams.get('company_id'));
    const mes = searchParams.get('mes');
    const ano = searchParams.get('ano');
    const vendedorIds = await resolveScopedVendedorIds(client, scope, vendedorId);

    const mesNum = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anoNum = ano ? parseInt(ano) : new Date().getFullYear();
    const dataInicio = `${anoNum}-${String(mesNum).padStart(2, '0')}-01`;
    const dataFim = new Date(anoNum, mesNum, 0).toISOString().slice(0, 10);

    const vendas = await fetchSalesReportRows(client, {
      dataInicio,
      dataFim,
      companyIds,
      vendedorIds
    });
    const commissionContext = await fetchCommissionContext(client, { companyIds, rows: vendas as any });
    const persistedSnapshot = await fetchPersistedComissoes(client, {
      companyIds,
      vendaIds: (vendas || []).map((row) => row.id),
      vendedorIds: (vendas || []).map((row) => String(row.vendedor_id || '')).filter(Boolean)
    });
    const persistedByKey = new Map(
      persistedSnapshot.rows.map((row) => [buildPersistedComissaoKey(row.venda_id, row.vendedor_id), row] as const)
    );

    let items = (vendas || []).map((v: any) => {
      const resolved = resolveVendaCommission(v, commissionContext);
      const persisted = persistedByKey.get(buildPersistedComissaoKey(v.id, v.vendedor_id));
      const persistedApplied = applyPersistedComissao(
        {
          valor_venda: resolved.valorVenda,
          valor_comissionavel: resolved.valorComissionavel,
          percentual_aplicado: resolved.percentual,
          valor_comissao: resolved.valorComissao,
          valor_pago: 0,
          status: 'pendente'
        },
        persisted
      );
      return {
        id: v.id,
        venda_id: v.id,
        numero_venda: v.numero_venda || `VD-${v.id.slice(0, 8)}`,
        data_venda: v.data_venda,
        cliente: getVendaClienteNome(v),
        vendedor_id: v.vendedor_id,
        vendedor: getVendaVendedorNome(v),
        valor_venda: persistedApplied.valor_venda,
        valor_comissionavel: persistedApplied.valor_comissionavel,
        percentual_aplicado: persistedApplied.percentual_aplicado,
        valor_comissao: persistedApplied.valor_comissao,
        valor_pago: persistedApplied.valor_pago,
        regra_nome: resolved.regraNome,
        status: persistedApplied.status.toUpperCase(),
        mes_referencia: mesNum,
        ano_referencia: anoNum,
        data_pagamento: persisted?.data_pagamento || null
      };
    });

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
