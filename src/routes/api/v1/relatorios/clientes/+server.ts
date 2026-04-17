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
  getClienteCategoria,
  getCurrentYearRange,
  getVendaClienteEmail,
  getVendaClienteNome,
  monthSpanInclusive
} from '$lib/server/relatorios';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['relatorios', 'clientes'], 1, 'Sem acesso ao relatorio de clientes.');
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

    const rows = await fetchSalesReportRows(client, {
      dataInicio,
      dataFim,
      companyIds,
      vendedorIds
    });

    const months = monthSpanInclusive(dataInicio, dataFim);
    const byClient = new Map<
      string,
      {
        cliente_id: string | null;
        cliente: string;
        cpf: string | null;
        email: string | null;
        total_compras: number;
        total_gasto: number;
        ultima_compra: string | null;
      }
    >();

    rows.forEach((row) => {
      const clientKey = String(row.cliente_id || '').trim() || `sem-cliente:${row.id}`;
      const clienteRow = row.clientes as any;
      const cpf = clienteRow?.cpf ?? null;
      const current = byClient.get(clientKey) || {
        cliente_id: String(row.cliente_id || '').trim() || null,
        cliente: getVendaClienteNome(row),
        cpf: cpf ?? null,
        email: getVendaClienteEmail(row),
        total_compras: 0,
        total_gasto: 0,
        ultima_compra: null
      };

      current.total_compras += 1;
      current.total_gasto += Number(row.valor_total || 0);
      if (row.data_venda && (!current.ultima_compra || row.data_venda > current.ultima_compra)) {
        current.ultima_compra = row.data_venda;
      }

      byClient.set(clientKey, current);
    });

    const items = Array.from(byClient.values())
      .map((item) => {
        // Parity alias for VTUR-APP: expose client CPF as a direct field
        const cpfAlias = item.cpf ?? null;
        const ticketMedio = item.total_compras > 0 ? item.total_gasto / item.total_compras : 0;
        return {
          ...item,
          cliente_cpf: cpfAlias,
          cliente_display: item.cliente,
          // Additional parity aliases for templates
          cliente_nome: item.cliente,
          cliente_email: item.email,
          cliente_display_name: item.cliente,
          cliente_name: item.cliente,
          ticket_medio: ticketMedio,
          frequencia: item.total_compras / months,
          categoria: getClienteCategoria(item.total_compras, item.total_gasto)
        };
      })
      .sort((left, right) => right.total_gasto - left.total_gasto);

    return json({
      items,
      total: items.length,
      periodo: {
        data_inicio: dataInicio,
        data_fim: dataFim
      }
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar relatorio de clientes.');
  }
}
