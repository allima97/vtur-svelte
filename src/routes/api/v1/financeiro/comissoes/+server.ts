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
    const commissionContext = await fetchCommissionContext(client, companyIds);

    let items = rows.map((row) => {
      const commission = resolveVendaCommission(row, commissionContext);
      const valorPago = 0;
      const itemStatus = 'pendente';

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
        valor_venda: commission.valorVenda,
        valor_comissionavel: commission.valorComissionavel,
        percentual_aplicado: commission.percentual,
        regra_nome: commission.regraNome,
        tipo_pacote: commission.tipoPacote,
        valor_comissao: commission.valorComissao,
        valor_pago: valorPago,
        valor_taxas: Number(row.valor_taxas || 0),
        data_venda: row.data_venda,
        data_embarque: row.data_embarque,
        status: itemStatus,
        // Parity alias for UI/templates
        status_label: itemStatus
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
        atual.total_pago += c.valor_comissao;
      } else {
        atual.total_pendente += c.valor_comissao;
      }
      resumoMap.set(vendedorKey, atual);
    });

    return json({
      items,
      total: items.length,
      resumo: Array.from(resumoMap.values())
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar comissoes.');
  }
}
