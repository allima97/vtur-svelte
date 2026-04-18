import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  getMonthRange,
  hasModuloAccess,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

type DashboardVendaRow = {
  id: string;
  vendedor_id: string | null;
  cliente_id: string | null;
  company_id: string | null;
  data_venda: string | null;
  data_embarque: string | null;
  data_final: string | null;
  valor_total: number | null;
  valor_taxas?: number | null;
  cancelada: boolean | null;
  clientes?: { id?: string | null; nome?: string | null } | null;
  destinos?: { nome?: string | null } | null;
  destino_cidade?: { id?: string | null; nome?: string | null } | null;
  recibos?: Array<{
    id?: string | null;
    valor_total?: number | null;
    valor_taxas?: number | null;
    valor_du?: number | null;
    valor_rav?: number | null;
    tipo_produtos?: { id?: string | null; nome?: string | null; tipo?: string | null } | null;
    produto_resolvido?: { id?: string | null; nome?: string | null } | null;
  }> | null;
};

type DashboardQuoteRow = {
  id: string;
  created_at: string | null;
  status: string | null;
  status_negociacao: string | null;
  total: number | null;
  client_id: string | null;
  cliente?: { id?: string | null; nome?: string | null } | null;
  quote_item?: Array<{
    id?: string | null;
    title?: string | null;
    product_name?: string | null;
    item_type?: string | null;
    city_name?: string | null;
  }> | null;
};

function getReceipts(row: DashboardVendaRow) {
  return Array.isArray(row.recibos) ? row.recibos : [];
}

function isSeguro(recibo: NonNullable<DashboardVendaRow['recibos']>[number]) {
  const label = `${recibo?.tipo_produtos?.nome || ''} ${recibo?.tipo_produtos?.tipo || ''}`.toLowerCase();
  return label.includes('seguro');
}

function deriveValorTotal(row: DashboardVendaRow) {
  const recibos = getReceipts(row);
  if (recibos.length > 0) {
    const totalRecibos = recibos.reduce((sum, recibo) => sum + Number(recibo?.valor_total || 0), 0);
    if (totalRecibos > 0) return totalRecibos;
  }
  return Number(row.valor_total || 0);
}

function deriveValorTaxas(row: DashboardVendaRow) {
  const recibos = getReceipts(row);
  const taxasRecibos = recibos.reduce((sum, recibo) => {
    return sum + Number(recibo?.valor_taxas || 0) + Number(recibo?.valor_du || 0) + Number(recibo?.valor_rav || 0);
  }, 0);
  if (taxasRecibos > 0) return taxasRecibos;
  return Number(row.valor_taxas || 0);
}

function deriveTotalSeguro(row: DashboardVendaRow) {
  return getReceipts(row)
    .filter((recibo) => isSeguro(recibo))
    .reduce((sum, recibo) => sum + Number(recibo?.valor_total || 0), 0);
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['dashboard'], 1, 'Sem acesso ao Dashboard.');
    }

    const { searchParams } = event.url;
    const { inicio: defaultInicio, fim: defaultFim } = getMonthRange();
    const inicio = String(searchParams.get('inicio') || defaultInicio).trim();
    const fim = String(searchParams.get('fim') || defaultFim).trim();
    const includeOrcamentos = String(searchParams.get('include_orcamentos') || '1').trim() === '1';
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('company_id'));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, searchParams.get('vendedor_ids'));
    const canOperacao = scope.isAdmin || hasModuloAccess(scope, ['operacao'], 1);
    const canConsultoria =
      scope.isAdmin || hasModuloAccess(scope, ['consultoria_online', 'consultoria'], 1);

    let salesQuery = client
      .from('vendas')
      .select(`
        id,
        vendedor_id,
        cliente_id,
        company_id,
        data_venda,
        data_embarque,
        data_final,
        valor_total,
        valor_taxas,
        cancelada,
        clientes:cliente_id (id, nome),
        destinos:produtos!destino_id (nome),
        destino_cidade:cidades!destino_cidade_id (id, nome),
        recibos:vendas_recibos (
          id,
          valor_total,
          valor_taxas,
          valor_du,
          valor_rav,
          tipo_produtos (id, nome, tipo),
          produto_resolvido:produtos!produto_resolvido_id (id, nome)
        )
      `)
      .eq('cancelada', false)
      .gte('data_venda', inicio)
      .lte('data_venda', fim)
      .order('data_venda', { ascending: true })
      .limit(5000);

    if (companyIds.length > 0) {
      salesQuery = salesQuery.in('company_id', companyIds);
    }

    if (vendedorIds.length > 0) {
      salesQuery = salesQuery.in('vendedor_id', vendedorIds);
    }

    const { data: salesData, error: salesError } = await salesQuery;

    if (salesError) {
      throw salesError;
    }

    const sales = (salesData || []) as DashboardVendaRow[];

    const totalVendas = sales.reduce((sum, row) => sum + deriveValorTotal(row), 0);
    const qtdVendas = sales.length;
    const totalTaxas = sales.reduce((sum, row) => sum + deriveValorTaxas(row), 0);
    const totalSeguro = sales.reduce((sum, row) => sum + deriveTotalSeguro(row), 0);

    const timelineMap = new Map<string, number>();
    const destinoMap = new Map<string, number>();
    const produtoMap = new Map<string, { id: string; name: string; value: number }>();

    sales.forEach((row) => {
      const saleDate = String(row.data_venda || '').trim();
      const valorTotal = deriveValorTotal(row);
      if (saleDate) {
        timelineMap.set(saleDate, (timelineMap.get(saleDate) || 0) + valorTotal);
      }

      const destinoNome = String(row.destinos?.nome || row.destino_cidade?.nome || 'Destino nao informado');
      destinoMap.set(destinoNome, (destinoMap.get(destinoNome) || 0) + valorTotal);

      const recibos = getReceipts(row);
      if (recibos.length === 0) {
        const current = produtoMap.get('sem-produto') || {
          id: 'sem-produto',
          name: 'Produto',
          value: 0
        };

        produtoMap.set('sem-produto', {
          ...current,
          value: current.value + valorTotal
        });
        return;
      }

      recibos.forEach((recibo) => {
        const productId = String(recibo?.tipo_produtos?.id || recibo?.produto_resolvido?.id || 'sem-produto');
        const productName = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || 'Produto');
        const current = produtoMap.get(productId) || {
          id: productId,
          name: productName,
          value: 0
        };

        produtoMap.set(productId, {
          ...current,
          value: current.value + Number(recibo?.valor_total || 0)
        });
      });
    });

    let metasQuery = client
      .from('metas_vendedor')
      .select('id, vendedor_id, periodo, meta_geral, meta_diferenciada, ativo, scope')
      .eq('ativo', true)
      .gte('periodo', inicio)
      .lte('periodo', fim)
      .limit(500);

    if (vendedorIds.length > 0) {
      metasQuery = metasQuery.in('vendedor_id', vendedorIds);
    }

    const { data: metasData, error: metasError } = await metasQuery;

    if (metasError) {
      throw metasError;
    }

    let orcamentos: DashboardQuoteRow[] = [];

    if (includeOrcamentos) {
      let quotesQuery = client
        .from('quote')
        .select(`
          id,
          created_at,
          status,
          status_negociacao,
          total,
          client_id,
          cliente:client_id (id, nome),
          quote_item (id, title, product_name, item_type, city_name)
        `)
        .gte('created_at', `${inicio}T00:00:00`)
        .lte('created_at', `${fim}T23:59:59.999`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (vendedorIds.length > 0) {
        quotesQuery = quotesQuery.in('created_by', vendedorIds);
      } else if (companyIds.length > 0) {
        const clientIds = await resolveAccessibleClientIds(client, {
          companyIds,
          vendedorIds: []
        });

        if (clientIds.length === 0) {
          return json({
            inicio,
            fim,
            userCtx: {
              usuarioId: user.id,
              nome: scope.nome,
              papel: scope.papel,
              vendedorIds
            },
            podeVerOperacao: canOperacao,
            podeVerConsultoria: canConsultoria,
            vendasAgg: {
              totalVendas,
              totalTaxas,
              totalLiquido: totalVendas - totalTaxas,
              totalSeguro,
              qtdVendas,
              ticketMedio: qtdVendas > 0 ? totalVendas / qtdVendas : 0,
              timeline: Array.from(timelineMap.entries()).map(([date, value]) => ({ date, value })),
              topDestinos: Array.from(destinoMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((left, right) => right.value - left.value)
                .slice(0, 5),
              porProduto: Array.from(produtoMap.values())
                .sort((left, right) => right.value - left.value)
                .slice(0, 6)
            },
            metas: metasData || [],
            orcamentos: [],
            widgetPrefs: []
          });
        }

        quotesQuery = quotesQuery.in('client_id', clientIds);
      }

      const { data: quotesData, error: quotesError } = await quotesQuery;

      if (quotesError) {
        throw quotesError;
      }

      orcamentos = (quotesData || []) as DashboardQuoteRow[];
    }

    const { data: widgetPrefsData } = await client
      .from('dashboard_widgets')
      .select('widget, ordem, visivel, settings')
      .eq('usuario_id', user.id)
      .order('ordem', { ascending: true })
      .limit(100);

    return json({
      inicio,
      fim,
      userCtx: {
        usuarioId: user.id,
        nome: scope.nome,
        papel: scope.papel,
        vendedorIds
      },
      podeVerOperacao: canOperacao,
      podeVerConsultoria: canConsultoria,
      vendasAgg: {
        totalVendas,
        totalTaxas,
        totalLiquido: totalVendas - totalTaxas,
        totalSeguro,
        qtdVendas,
        ticketMedio: qtdVendas > 0 ? totalVendas / qtdVendas : 0,
        timeline: Array.from(timelineMap.entries()).map(([date, value]) => ({ date, value })),
        topDestinos: Array.from(destinoMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((left, right) => right.value - left.value)
          .slice(0, 5),
        porProduto: Array.from(produtoMap.values())
          .sort((left, right) => right.value - left.value)
          .slice(0, 6)
      },
      metas: metasData || [],
      orcamentos,
      widgetPrefs: widgetPrefsData || []
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar dashboard.');
  }
}
