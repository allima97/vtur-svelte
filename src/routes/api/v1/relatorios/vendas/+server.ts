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
import {
  fetchLatestPaymentForms,
  fetchSalesReportRows,
  getCurrentYearRange,
  getReceiptProductDescriptor,
  getVendaClienteNome,
  getVendaCodigo,
  getVendaCommission,
  getVendaDestino,
  getVendaStatus,
  getVendaVendedorNome
} from '$lib/server/relatorios';

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
    const dataInicio = String(searchParams.get('data_inicio') || defaultRange.dataInicio).trim();
    const dataFim = String(searchParams.get('data_fim') || defaultRange.dataFim).trim();
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

    const rows = await fetchSalesReportRows(client, {
      dataInicio,
      dataFim,
      companyIds,
      vendedorIds,
      includeCancelled: true
    });
    const paymentForms = await fetchLatestPaymentForms(
      client,
      rows.map((row) => row.id)
    );

    const filteredRows = rows.filter((row) => {
      if (clienteId && String(row.cliente_id || '').trim() !== clienteId) {
        return false;
      }

      const destino = getVendaDestino(row).toLowerCase();
      if (destinoFilter && !destino.includes(destinoFilter)) {
        return false;
      }

      if (produtoFilter || tipoProdutoFilter) {
        const recibos = Array.isArray(row.recibos) && row.recibos.length > 0 ? row.recibos : [null];
        const matches = recibos.some((recibo) => {
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

    let items = filteredRows.map((row) => {
      const status = getVendaStatus(row);

      // Mapear recibos para o formato detalhado
        const recibos = (row.recibos || []).map((recibo: any) => {
          const descriptor = getReceiptProductDescriptor(recibo, row);
          return {
            id: recibo?.id || null,
            numero_recibo: recibo?.numero_recibo || null,
            recibo_display: recibo?.numero_recibo || null,
            numero_recibo_normalizado: recibo?.numero_recibo_normalizado ?? null,
            recibo_short: String(recibo?.numero_recibo ?? '').slice(0, 8),
            data_venda: recibo?.data_venda || row.data_venda,
          tipo_produto: descriptor.tipo,
          produto_nome: descriptor.produto,
          cidade_nome: row.destino_cidade?.nome || null,
          valor_total: Number(recibo?.valor_total || 0),
          valor_taxas: Number(recibo?.valor_taxas || 0),
          valor_du: Number(recibo?.valor_du || 0),
          valor_rav: Number(recibo?.valor_rav || 0),
          percentual_comissao_loja: Number(recibo?.percentual_comissao_loja || 0),
          faixa_comissao: recibo?.faixa_comissao || null,
          valor_comissao_loja: Number(recibo?.valor_comissao_loja || 0)
        };
      });

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
        valor_total: Number(row.valor_total || 0),
        valor_taxas: Number(row.valor_taxas || 0),
        cancelada: row.cancelada || false,
        status,
        forma_pagamento: paymentForms.get(row.id) || 'Nao informado',
        recibos,
        // KPIs por venda
        comissao: getVendaCommission(row),
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

    // KPIs agregados
    const totalVendas = items.length;
    const vendasConfirmadas = items.filter(i => i.status === 'confirmada').length;
    const vendasCanceladas = items.filter(i => i.status === 'cancelada').length;
    const totalValor = items.reduce((sum, item) => sum + Number(item.valor_total || 0), 0);
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
      periodo: {
        data_inicio: dataInicio,
        data_fim: dataFim
      }
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar relatorio de vendas.');
  }
}
