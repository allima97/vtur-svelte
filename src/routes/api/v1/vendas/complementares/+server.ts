import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  normalizeText,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

type SaleScopeRow = {
  id: string;
  cliente_id: string | null;
  vendedor_id: string | null;
  company_id: string | null;
};

function getResumo(recibo?: {
  numero_recibo?: string | null;
  valor_total?: number | null;
  produto_nome?: string | null;
}, venda?: {
  cliente_nome?: string | null;
  destino_nome?: string | null;
  destino_cidade_nome?: string | null;
}) {
  const numero = recibo?.numero_recibo ? `Recibo ${recibo.numero_recibo}` : 'Recibo';
  const cliente = venda?.cliente_nome || 'Cliente';
  const titulo = `${numero} - ${cliente}`.trim();
  const detalhes = [
    recibo?.produto_nome || '',
    venda?.destino_cidade_nome || venda?.destino_nome || '',
    typeof recibo?.valor_total === 'number'
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recibo.valor_total)
      : ''
  ]
    .filter(Boolean)
    .join(' - ');
  return { titulo, detalhes };
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 1, 'Sem acesso a Vendas.');
    }

    const vendaId = String(event.url.searchParams.get('venda_id') || '').trim();
    const busca = normalizeText(String(event.url.searchParams.get('q') || '').trim());
    if (!isUuid(vendaId)) {
      return new Response('venda_id invalido.', { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get('company_id') || event.url.searchParams.get('empresa_id')
    );
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get('vendedor_ids') || event.url.searchParams.get('vendedor_id')
    );

    let saleQuery = client
      .from('vendas')
      .select('id, cliente_id, vendedor_id, company_id')
      .eq('id', vendaId);
    if (companyIds.length > 0) saleQuery = saleQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) saleQuery = saleQuery.in('vendedor_id', vendedorIds);

    const { data: currentSale, error: currentSaleError } = await saleQuery.maybeSingle();
    if (currentSaleError) throw currentSaleError;
    if (!currentSale) {
      return new Response('Venda nao encontrada.', { status: 404 });
    }

    const { data: currentReceiptsData, error: currentReceiptsError } = await client
      .from('vendas_recibos')
      .select('id')
      .eq('venda_id', vendaId);
    if (currentReceiptsError) throw currentReceiptsError;

    const currentReceiptIds = (currentReceiptsData || [])
      .map((row: any) => String(row?.id || '').trim())
      .filter(Boolean);

    const { data: currentLinksData, error: currentLinksError } = await client
      .from('vendas_recibos_complementares')
      .select('id, venda_id, recibo_id')
      .eq('venda_id', vendaId);
    if (currentLinksError && String(currentLinksError.code || '') !== '42P01') throw currentLinksError;

    const currentLinks = Array.isArray(currentLinksData) ? currentLinksData : [];
    const linkedReceiptIds = currentLinks
      .map((row: any) => String(row?.recibo_id || '').trim())
      .filter(Boolean);

    const { data: linkedReceiptsData, error: linkedReceiptsError } =
      linkedReceiptIds.length > 0
        ? await client
            .from('vendas_recibos')
            .select(`
              id,
              venda_id,
              numero_recibo,
              valor_total,
              produto_resolvido:produtos!produto_resolvido_id (nome)
            `)
            .in('id', linkedReceiptIds)
        : { data: [], error: null as any };
    if (linkedReceiptsError) throw linkedReceiptsError;

    const linkedSalesIds = Array.from(
      new Set(
        (linkedReceiptsData || [])
          .map((row: any) => String(row?.venda_id || '').trim())
          .filter(Boolean)
      )
    );

    const { data: linkedSalesData, error: linkedSalesError } =
      linkedSalesIds.length > 0
        ? await client
            .from('vendas')
            .select(`
              id,
              cliente_id,
              destino_id,
              destino_cidade_id,
              clientes (nome),
              destinos:produtos!destino_id (nome),
              destino_cidade:cidades!destino_cidade_id (nome)
            `)
            .in('id', linkedSalesIds)
        : { data: [], error: null as any };
    if (linkedSalesError) throw linkedSalesError;

    const linkedReceiptsById = Object.fromEntries(
      (linkedReceiptsData || []).map((row: any) => [
        String(row?.id || ''),
        {
          id: String(row?.id || ''),
          venda_id: String(row?.venda_id || ''),
          numero_recibo: row?.numero_recibo || null,
          valor_total: Number(row?.valor_total || 0),
          produto_nome: row?.produto_resolvido?.nome || null
        }
      ])
    );
    const linkedSalesById = Object.fromEntries(
      (linkedSalesData || []).map((row: any) => [
        String(row?.id || ''),
        {
          id: String(row?.id || ''),
          cliente_nome: row?.clientes?.nome || '',
          destino_nome: row?.destinos?.nome || '',
          destino_cidade_nome: row?.destino_cidade?.nome || ''
        }
      ])
    );

    const pairSaleIds = Array.from(new Set(linkedSalesIds));
    const { data: pairReceiptsData, error: pairReceiptsError } =
      pairSaleIds.length > 0
        ? await client.from('vendas_recibos').select('id, venda_id').in('venda_id', [vendaId, ...pairSaleIds])
        : { data: [], error: null as any };
    if (pairReceiptsError) throw pairReceiptsError;

    const receiptsBySale = new Map<string, string[]>();
    for (const row of pairReceiptsData || []) {
      const saleRef = String((row as any)?.venda_id || '').trim();
      const receiptRef = String((row as any)?.id || '').trim();
      if (!saleRef || !receiptRef) continue;
      const current = receiptsBySale.get(saleRef) || [];
      current.push(receiptRef);
      receiptsBySale.set(saleRef, current);
    }

    const { data: allPairLinksData, error: allPairLinksError } =
      pairSaleIds.length > 0
        ? await client
            .from('vendas_recibos_complementares')
            .select('id, venda_id, recibo_id')
            .in('venda_id', [vendaId, ...pairSaleIds])
        : { data: [], error: null as any };
    if (allPairLinksError && String(allPairLinksError.code || '') !== '42P01') throw allPairLinksError;

    const allPairLinks = Array.isArray(allPairLinksData) ? allPairLinksData : [];

    const current = currentLinks.map((link: any) => {
      const recibo = linkedReceiptsById[String(link?.recibo_id || '')];
      const linkedSaleId = String(recibo?.venda_id || '').trim();
      const sale = linkedSalesById[linkedSaleId];
      const currentSaleReceipts = new Set(receiptsBySale.get(vendaId) || currentReceiptIds);
      const linkedSaleReceipts = new Set(receiptsBySale.get(linkedSaleId) || []);
      const relatedIds = allPairLinks
        .filter((row: any) => {
          const rowSaleId = String(row?.venda_id || '').trim();
          const rowReceiptId = String(row?.recibo_id || '').trim();
          if (!rowSaleId || !rowReceiptId) return false;
          if (rowSaleId === vendaId && linkedSaleReceipts.has(rowReceiptId)) return true;
          if (rowSaleId === linkedSaleId && currentSaleReceipts.has(rowReceiptId)) return true;
          return false;
        })
        .map((row: any) => String(row?.id || '').trim())
        .filter(Boolean);

      return {
        id: String(link?.id || ''),
        venda_id: String(link?.venda_id || ''),
        recibo_id: String(link?.recibo_id || ''),
        linked_venda_id: linkedSaleId,
        related_ids: Array.from(new Set(relatedIds)),
        resumo: getResumo(recibo, sale)
      };
    });

    let suggestions: any[] = [];
    if (busca.length >= 2) {
      let receiptsQuery = client
        .from('vendas_recibos')
        .select(`
          id,
          venda_id,
          numero_recibo,
          valor_total,
          produto_resolvido:produtos!produto_resolvido_id (nome),
          vendas!inner (
            id,
            cliente_id,
            vendedor_id,
            company_id,
            clientes (nome),
            destinos:produtos!destino_id (nome),
            destino_cidade:cidades!destino_cidade_id (nome)
          )
        `)
        .limit(400);

      if (companyIds.length > 0) receiptsQuery = receiptsQuery.in('vendas.company_id', companyIds);
      if (vendedorIds.length > 0) receiptsQuery = receiptsQuery.in('vendas.vendedor_id', vendedorIds);

      const { data: scopedReceiptsData, error: scopedReceiptsError } = await receiptsQuery;
      if (scopedReceiptsError) throw scopedReceiptsError;

      const currentLinkedIds = new Set(current.map((item) => item.recibo_id));

      suggestions = (scopedReceiptsData || [])
        .map((row: any) => {
          const linkedSale = row?.vendas;
          const linkedSaleId = String(linkedSale?.id || '').trim();
          const reciboId = String(row?.id || '').trim();
          return {
            recibo_id: reciboId,
            venda_id: linkedSaleId,
            numero_recibo: row?.numero_recibo || null,
            valor_total: Number(row?.valor_total || 0),
            produto_nome: row?.produto_resolvido?.nome || null,
            cliente_nome: linkedSale?.clientes?.nome || '',
            destino_nome: linkedSale?.destinos?.nome || '',
            destino_cidade_nome: linkedSale?.destino_cidade?.nome || '',
            sale_receipt_ids: receiptsBySale.get(linkedSaleId) || [],
            resumo: getResumo(
              {
                numero_recibo: row?.numero_recibo || null,
                valor_total: Number(row?.valor_total || 0),
                produto_nome: row?.produto_resolvido?.nome || null
              },
              {
                cliente_nome: linkedSale?.clientes?.nome || '',
                destino_nome: linkedSale?.destinos?.nome || '',
                destino_cidade_nome: linkedSale?.destino_cidade?.nome || ''
              }
            )
          };
        })
        .filter((item) => item.venda_id && item.venda_id !== vendaId)
        .filter((item) => !currentLinkedIds.has(item.recibo_id))
        .filter((item) => {
          const searchText = normalizeText(
            [
              item.numero_recibo,
              item.produto_nome,
              item.cliente_nome,
              item.destino_nome,
              item.destino_cidade_nome,
              item.recibo_id,
              item.venda_id
            ]
              .filter(Boolean)
              .join(' ')
          );
          return searchText.includes(busca);
        })
        .slice(0, 10);
    }

    return json({
      current_receipt_ids: currentReceiptIds,
      current,
      suggestions
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar recibos complementares.');
  }
}
