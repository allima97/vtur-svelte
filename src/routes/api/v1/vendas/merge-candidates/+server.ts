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

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 1, 'Sem permissao para ver vendas.');
    }

    const vendaId = String(event.url.searchParams.get('venda_id') || '').trim();
    if (!isUuid(vendaId)) {
      return new Response('venda_id invalido.', { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get('company_id') || event.url.searchParams.get('empresa_id')
    );
    const requestedVendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get('vendedor_ids') || event.url.searchParams.get('vendedor_id')
    );

    let currentSaleQuery = client
      .from('vendas')
      .select('id, cliente_id, vendedor_id, company_id')
      .eq('id', vendaId);
    if (companyIds.length > 0) currentSaleQuery = currentSaleQuery.in('company_id', companyIds);
    if (requestedVendedorIds.length > 0) currentSaleQuery = currentSaleQuery.in('vendedor_id', requestedVendedorIds);

    const { data: currentSale, error: currentSaleError } = await currentSaleQuery.maybeSingle();
    if (currentSaleError) throw currentSaleError;
    if (!currentSale) {
      return new Response('Venda nao encontrada.', { status: 404 });
    }

    let query = client
      .from('vendas')
      .select(`
        id,
        vendedor_id,
        cliente_id,
        destino_id,
        destino_cidade_id,
        company_id,
        data_lancamento,
        data_venda,
        data_embarque,
        data_final,
        valor_total,
        clientes (nome),
        destinos:produtos!destino_id (nome, cidade_id),
        destino_cidade:cidades!destino_cidade_id (id, nome),
        vendedor:users!vendedor_id (nome_completo)
      `)
      .eq('cliente_id', currentSale.cliente_id)
      .eq('vendedor_id', currentSale.vendedor_id)
      .neq('id', currentSale.id)
      .order('data_venda', { ascending: false });

    if (companyIds.length > 0) query = query.in('company_id', companyIds);

    if (!scope.isAdmin && scope.isGestor) {
      const teamIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
      if (teamIds.length === 0) {
        return json({ items: [] });
      }
      query = query.in('vendedor_id', teamIds);
    } else if (scope.isMaster && requestedVendedorIds.length > 0) {
      query = query.in('vendedor_id', requestedVendedorIds);
    }

    const { data: salesData, error: salesError } = await query;
    if (salesError) throw salesError;

    const saleIds = (salesData || [])
      .map((row: any) => String(row?.id || '').trim())
      .filter(Boolean);

    const receiptsBySale = new Map<string, string[]>();
    if (saleIds.length > 0) {
      const { data: receiptsData, error: receiptsError } = await client
        .from('vendas_recibos')
        .select('venda_id, numero_recibo')
        .in('venda_id', saleIds)
        .order('numero_recibo', { ascending: true });
      if (receiptsError) throw receiptsError;

      for (const row of receiptsData || []) {
        const refSaleId = String((row as any)?.venda_id || '').trim();
        const numeroRecibo = String((row as any)?.numero_recibo || '').trim();
        if (!refSaleId || !numeroRecibo) continue;
        const current = receiptsBySale.get(refSaleId) || [];
        current.push(numeroRecibo);
        receiptsBySale.set(refSaleId, current);
      }
    }

    const items = (salesData || []).map((row: any) => {
      const numerosRecibo = Array.from(new Set(receiptsBySale.get(String(row?.id || '')) || []));
      const cidadeId = row?.destino_cidade_id || row?.destinos?.cidade_id || '';
      return {
        id: row.id,
        vendedor_id: row.vendedor_id,
        vendedor_nome: row?.vendedor?.nome_completo || '',
        cliente_id: row.cliente_id,
        destino_id: row.destino_id,
        destino_cidade_id: cidadeId,
        company_id: row.company_id,
        data_lancamento: row.data_lancamento,
        data_venda: row.data_venda,
        data_embarque: row.data_embarque,
        data_final: row.data_final,
        valor_total: row.valor_total,
        cliente_nome: row?.clientes?.nome || '',
        destino_nome: row?.destinos?.nome || '',
        destino_cidade_nome: row?.destino_cidade?.nome || '',
        numero_recibo_principal: numerosRecibo[0] || null,
        numeros_recibo: numerosRecibo
      };
    });

    return json({ items });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar vendas para mesclar.');
  }
}
