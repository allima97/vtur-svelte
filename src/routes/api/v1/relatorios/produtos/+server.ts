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
  getCurrentYearRange,
  getReceiptProductDescriptor,
  getVendaCommission
} from '$lib/server/relatorios';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['relatorios', 'produtos', 'cadastros'], 1, 'Sem acesso ao relatorio de produtos.');
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

    const byProduto = new Map<
      string,
      {
        produto: string;
        tipo: string;
        quantidade: number;
        receita: number;
        lucro: number;
      }
    >();

    rows.forEach((row) => {
      const recibos = Array.isArray(row.recibos) && row.recibos.length > 0 ? row.recibos : [null];

      recibos.forEach((recibo) => {
        const descriptor = getReceiptProductDescriptor(recibo, row);
        const receita = Number(recibo?.valor_total || row.valor_total || 0);
        const lucroRecibo =
          Number(recibo?.valor_taxas || 0) + Number(recibo?.valor_du || 0) + Number(recibo?.valor_rav || 0);
        const lucro = lucroRecibo > 0 ? lucroRecibo : getVendaCommission(row);
        const key = `${descriptor.produto}::${descriptor.tipo}`;
        const current = byProduto.get(key) || {
          produto: descriptor.produto,
          tipo: descriptor.tipo,
          quantidade: 0,
          receita: 0,
          lucro: 0
        };

        current.quantidade += 1;
        current.receita += receita;
        current.lucro += lucro;
        (current as any).produto_id = (row as any).produto_id ?? null;
        byProduto.set(key, current);
      });
    });

        const items = Array.from(byProduto.values())
      .map((item) => ({
        ...item,
        produto_id: (typeof (item as any).produto_id !== 'undefined') ? (item as any).produto_id : null,
        produto_nome: item.produto,
        nome: item.produto,
        produto_display: item.produto,
        produto_short: String(item.produto ?? '').slice(0, 20),
        produto_display_name: String(item.produto ?? ''),
        produto_display_short: String(item.produto ?? '').slice(0, 12),
        produto_alternative_display: String(item.produto ?? ''),
        produto_display_alias: String(item.produto ?? ''),
        produto_name_slug: String(item.produto ?? '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''),
        // Parity helper: URL for product detail pages
        produto_url: `/produtos/${(item.produto_id ?? item.produto_name_slug ?? '')}`,
        // New parity alias: product code (uppercase alphanumeric)
        produto_code: String(item.produto ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
        custo_medio: item.quantidade > 0 ? Math.max(item.receita - item.lucro, 0) / item.quantidade : 0,
        margem: item.receita > 0 ? (item.lucro / item.receita) * 100 : 0
      }))
      .sort((left, right) => right.receita - left.receita);

    return json({
      items,
      total: items.length,
      periodo: {
        data_inicio: dataInicio,
        data_fim: dataFim
      }
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar relatorio de produtos.');
  }
}
