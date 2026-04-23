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
  fetchSalesReportRows,
  getVendaVendedorNome,
  getVendaClienteNome
} from '$lib/server/relatorios';
import { fetchCommissionContext, resolveVendaCommission } from '$lib/server/comissoes';
import { applyPersistedComissao, buildPersistedComissaoKey, fetchPersistedComissoes } from '$lib/server/comissoes-registro';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro', 'comissoes'], 1, 'Sem acesso a Comissoes.');
    }

    const { searchParams } = event.url;
    const status = searchParams.get('status');
    const vendedorIdParam = searchParams.get('vendedor_id');
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id'));
    let vendedorIds = await resolveScopedVendedorIds(client, scope, searchParams.get('vendedor_ids'));

    // vendedor_id avulso tem prioridade sobre lista
    if (vendedorIdParam && vendedorIds.length === 0) {
      vendedorIds = [vendedorIdParam];
    }

    const rows = await fetchSalesReportRows(client, {
      companyIds,
      vendedorIds
    });
    const commissionContext = await fetchCommissionContext(client, { companyIds, rows });
    const persistedSnapshot = await fetchPersistedComissoes(client, {
      companyIds,
      vendaIds: rows.map((row) => row.id),
      vendedorIds: rows.map((row) => String(row.vendedor_id || '')).filter(Boolean)
    });
    const persistedByKey = new Map(
      persistedSnapshot.rows.map((row) => [buildPersistedComissaoKey(row.venda_id, row.vendedor_id), row] as const)
    );

    let items = rows.map((row) => {
      const commission = resolveVendaCommission(row, commissionContext);
      const persisted = persistedByKey.get(buildPersistedComissaoKey(row.id, row.vendedor_id));
      const persistedApplied = applyPersistedComissao(
        {
          valor_venda: commission.valorVenda,
          valor_comissionavel: commission.valorComissionavel,
          percentual_aplicado: commission.percentual,
          valor_comissao: commission.valorComissao,
          valor_pago: 0,
          status: 'pendente'
        },
        persisted
      );

      return {
        id: row.id,
        venda_id: row.id,
        numero_venda: row.numero_venda,
        cliente: getVendaClienteNome(row),
        cliente_id: row.cliente_id,
        vendedor: getVendaVendedorNome(row),
        vendedor_short: (getVendaVendedorNome(row) || '').slice(0, 20),
        vendedor_label: (getVendaVendedorNome(row) || ''),
        vendedor_id: row.vendedor_id,
        valor_venda: persistedApplied.valor_venda,
        valor_comissionavel: persistedApplied.valor_comissionavel,
        percentual_aplicado: persistedApplied.percentual_aplicado,
        regra_nome: commission.regraNome,
        tipo_pacote: commission.tipoPacote,
        valor_comissao: persistedApplied.valor_comissao,
        valor_pago: persistedApplied.valor_pago,
        valor_taxas: Number(row.valor_taxas || 0),
        data_venda: row.data_venda,
        data_embarque: row.data_embarque,
        status: persistedApplied.status,
        // Parity alias for UI/templates
        status_label: persistedApplied.status,
        data_pagamento: persisted?.data_pagamento || null,
        observacoes_pagamento: persisted?.observacoes_pagamento || null
      };
    });

    if (status && status !== 'todas') {
      items = items.filter((c) => c.status === status);
    }

    const resumoMap = new Map<string, any>();
    items.forEach((c) => {
      const vendedorKey = String(c.vendedor_id || '').trim() || 'sem-vendedor';
      const atual = resumoMap.get(vendedorKey) || {
        vendedor_id: c.vendedor_id,
        vendedor_nome: c.vendedor,
        total_vendas: 0,
        total_comissao: 0,
        total_pago: 0,
        total_pendente: 0
      };
      atual.total_vendas += 1;
      atual.total_comissao += c.valor_comissao;
      if (c.status === 'pago') {
        atual.total_pago += c.valor_pago || c.valor_comissao;
      } else if (c.status !== 'cancelada') {
        atual.total_pendente += c.valor_comissao;
      }
      resumoMap.set(vendedorKey, atual);
    });

    return json({
      items,
      total: items.length,
      resumo: Array.from(resumoMap.values()),
      persistencia_disponivel: persistedSnapshot.available
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar comissoes.');
  }
}
