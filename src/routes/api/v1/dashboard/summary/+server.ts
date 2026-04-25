import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  getMonthRange,
  hasModuloAccess,
  fetchGestorEquipeIdsComGestor,
  parseUuidList,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { fetchAndComputeVendasKpis } from '$lib/server/vendas-kpis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReciboRateio = {
  ativo?: boolean | null;
  vendedor_origem_id?: string | null;
  vendedor_destino_id?: string | null;
  percentual_origem?: number | null;
  percentual_destino?: number | null;
};

type DashboardRecibo = {
  id?: string | null;
  data_venda?: string | null;
  valor_total?: number | null;
  valor_taxas?: number | null;
  valor_du?: number | null;
  valor_rav?: number | null;
  tipo_produtos?: { id?: string | null; nome?: string | null; tipo?: string | null } | null;
  produto_resolvido?: { id?: string | null; nome?: string | null } | null;
  rateio?: ReciboRateio[] | null;
  // override de conciliação (preenchido em runtime, não vem do banco diretamente)
  _conciliacao_valor_bruto?: number | null;
  _conciliacao_valor_taxas?: number | null;
  _conciliacao_data_venda?: string | null;
  _conciliacao_is_seguro?: boolean | null;
};

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
  recibos?: DashboardRecibo[] | null;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function toDateKey(value?: string | null) {
  return String(value || '').slice(0, 10);
}

function isInRange(date: string, inicio: string, fim: string) {
  if (!date) return false;
  return date >= inicio && date <= fim;
}

function getReceipts(row: DashboardVendaRow): DashboardRecibo[] {
  return Array.isArray(row.recibos) ? row.recibos : [];
}

function isSeguro(recibo: DashboardRecibo) {
  if (recibo._conciliacao_is_seguro) return true;
  const tipo = String(recibo?.tipo_produtos?.tipo || '').toLowerCase();
  const nome = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || '').toLowerCase();
  return tipo.includes('seguro') || nome.includes('seguro');
}

function isConciliacaoEfetivada(status?: string | null, descricao?: string | null): boolean {
  const normalize = (v?: string | null) =>
    String(v || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
  const s = normalize(status);
  const d = normalize(descricao);
  return s.includes('BAIXA') || d.includes('BAIXA');
}

async function fetchGestorCompanyScopeIds(
  client: any,
  options: { companyIds?: string[]; userIds?: string[] }
) {
  const companyIds = Array.from(new Set((options.companyIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
  const userIds = Array.from(new Set((options.userIds || []).map((id) => String(id || '').trim()).filter(Boolean)));

  let query = client
    .from('users')
    .select('id, active, uso_individual, user_types(name), company_id')
    .limit(1000);

  if (userIds.length === 1) {
    query = query.eq('id', userIds[0]);
  } else if (userIds.length > 1) {
    query = query.in('id', userIds);
  } else if (companyIds.length === 1) {
    query = query.eq('company_id', companyIds[0]);
  } else if (companyIds.length > 1) {
    query = query.in('company_id', companyIds);
  }

  try {
    const { data, error } = await query;
    if (error) throw error;

    return (data || [])
      .filter((row: any) => {
        if (!row?.id) return false;
        if (row?.active === false) return false;
        if (row?.uso_individual === true) return false;
        if (userIds.length > 0) return true;
        const role = String((Array.isArray(row?.user_types) ? row.user_types[0]?.name : row?.user_types?.name) || '').toUpperCase();
        return role.includes('VENDEDOR') || role.includes('GESTOR');
      })
      .map((row: any) => String(row?.id || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Para um recibo, retorna as alocações com seus fatores de rateio.
 * Se escopo de vendedores definido, filtra apenas as relevantes.
 */
function getReciboAllocations(
  recibo: DashboardRecibo,
  vendedorId: string,
  scopeVendedorIds: Set<string>
): Array<{ vendedorId: string; fator: number }> {
  const rateioArr = Array.isArray(recibo?.rateio) ? recibo.rateio : [];
  const rateioAtivo = rateioArr.find((r) => r?.ativo !== false) ?? null;

  let base: Array<{ vendedorId: string; fator: number }>;

  if (
    rateioAtivo &&
    rateioAtivo.vendedor_origem_id &&
    rateioAtivo.vendedor_destino_id &&
    (rateioAtivo.percentual_origem ?? 0) > 0 &&
    (rateioAtivo.percentual_destino ?? 0) > 0
  ) {
    base = [
      {
        vendedorId: String(rateioAtivo.vendedor_origem_id),
        fator: Math.max(0, Math.min(1, toNum(rateioAtivo.percentual_origem) / 100))
      },
      {
        vendedorId: String(rateioAtivo.vendedor_destino_id),
        fator: Math.max(0, Math.min(1, toNum(rateioAtivo.percentual_destino) / 100))
      }
    ];
  } else {
    base = [{ vendedorId, fator: 1 }];
  }

  if (scopeVendedorIds.size > 0) {
    return base.filter((a) => scopeVendedorIds.has(a.vendedorId));
  }
  return base;
}

// ---------------------------------------------------------------------------
// Conciliação override
// Quando a empresa tem conciliacao_sobrepoe_vendas=true, os valores dos recibos
// devem ser substituídos pelos valores efetivos de conciliacao_recibos (BAIXA).
// ---------------------------------------------------------------------------

async function fetchConciliacaoSobrepoePorCompany(
  client: any,
  companyIds: string[]
): Promise<Set<string>> {
  if (companyIds.length === 0) return new Set();
  try {
    let q = client
      .from('parametros_comissao')
      .select('company_id')
      .eq('conciliacao_sobrepoe_vendas', true);
    q = companyIds.length === 1
      ? q.eq('company_id', companyIds[0])
      : q.in('company_id', companyIds);
    const { data, error } = await q;
    if (error) return new Set();
    return new Set((data || []).map((r: any) => String(r?.company_id || '')).filter(Boolean));
  } catch {
    return new Set();
  }
}

/**
 * Busca os overrides de conciliação para os recibos do período e retorna um mapa:
 * reciboId → { valorBruto, valorTaxas, dataVenda, isSeguro }
 *
 * Lógica espelhada do vtur-app fetchEffectiveConciliacaoReceipts:
 * - pega conciliacao_recibos com status BAIXA no período
 * - vincula a venda_recibo_id
 * - calcula valor efetivo = valor_lancamentos - valor_descontos - valor_abatimentos
 *
 * Nota: não filtramos por ranking_vendedor_id aqui porque a atribuição de vendedor
 * no conciliacao pode diferir do vendedor_id original da venda (ex: após rateio).
 * A filtragem por vendedor já acontece via recibo — só aplicamos override em recibos
 * que já estão no escopo da consulta principal.
 */
async function fetchConciliacaoOverrides(
  client: any,
  companyIds: string[],
  inicio: string,
  fim: string,
  knownReciboIds: string[]
): Promise<Map<string, { valorBruto: number; valorTaxas: number; dataVenda: string; isSeguro: boolean }>> {
  const result = new Map<string, { valorBruto: number; valorTaxas: number; dataVenda: string; isSeguro: boolean }>();
  if (companyIds.length === 0) return result;

  try {
    let q = client
      .from('conciliacao_recibos')
      .select('id, venda_recibo_id, movimento_data, status, descricao, valor_lancamentos, valor_taxas, valor_descontos, valor_abatimentos, valor_venda_real, is_seguro_viagem')
      .neq('is_baixa_rac', true)
      .gte('movimento_data', inicio)
      .lte('movimento_data', fim)
      .not('venda_recibo_id', 'is', null)
      .limit(5000);

    q = companyIds.length === 1 ? q.eq('company_id', companyIds[0]) : q.in('company_id', companyIds);

    // Filtra pelos recibos que já temos no escopo (evita sobrecarga e resultado irrelevante)
    if (knownReciboIds.length > 0 && knownReciboIds.length <= 500) {
      q = q.in('venda_recibo_id', knownReciboIds);
    }

    const { data, error } = await q;
    if (error || !data) return result;

    // Agrupa por venda_recibo_id, pega só efetivados (BAIXA)
    const byReciboId = new Map<string, any[]>();
    for (const row of data as any[]) {
      const reciboId = String(row?.venda_recibo_id || '').trim();
      if (!reciboId) continue;
      if (!byReciboId.has(reciboId)) byReciboId.set(reciboId, []);
      byReciboId.get(reciboId)!.push(row);
    }

    byReciboId.forEach((rows, reciboId) => {
      // Pega apenas linhas com status BAIXA — sem fallback, pois sem BAIXA não há override
      const baixas = rows.filter((r) => isConciliacaoEfetivada(r?.status, r?.descricao));
      if (baixas.length === 0) return;

      // Pega a BAIXA mais recente
      const sourceRow = baixas.sort((a, b) =>
        String(b?.movimento_data || '').localeCompare(String(a?.movimento_data || ''))
      )[0];

      if (!sourceRow) return;

      const lancamentos = toNum(sourceRow?.valor_lancamentos);
      const taxas = toNum(sourceRow?.valor_taxas);
      const descontos = toNum(sourceRow?.valor_descontos);
      const abatimentos = toNum(sourceRow?.valor_abatimentos);
      const valorVendaReal = toNum(sourceRow?.valor_venda_real);

      // Valor bruto efetivo = lancamentos - descontos - abatimentos (mesmo cálculo do vtur-app)
      const valorBrutoCalculado = Math.max(0, lancamentos - descontos - abatimentos);
      const valorBruto = valorBrutoCalculado > 0 ? valorBrutoCalculado : (valorVendaReal > 0 ? valorVendaReal : lancamentos);

      if (valorBruto <= 0) return;

      result.set(reciboId, {
        valorBruto,
        valorTaxas: taxas,
        dataVenda: String(sourceRow?.movimento_data || '').slice(0, 10),
        isSeguro: Boolean(sourceRow?.is_seguro_viagem)
      });
    });
  } catch {
    // best-effort
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const { searchParams } = event.url;
    const { inicio: defaultInicio, fim: defaultFim } = getMonthRange();
    const inicio = String(searchParams.get('inicio') || defaultInicio).trim();
    const fim = String(searchParams.get('fim') || defaultFim).trim();
    const includeOrcamentos = String(searchParams.get('include_orcamentos') || '1').trim() === '1';

    const requestedCompanyId = searchParams.get('company_id');
    const requestedVendedorIds = parseUuidList(searchParams.get('vendedor_ids'));

    const tipoNome = String(scope.tipoNome || '').toUpperCase();
    const isAdminByType = tipoNome.includes('ADMIN');
    const isGestorByType = tipoNome.includes('GESTOR');
    const isMasterByType = tipoNome.includes('MASTER');
    const responsePapel = isAdminByType
      ? 'ADMIN'
      : isMasterByType
        ? 'MASTER'
        : isGestorByType
          ? 'GESTOR'
          : 'VENDEDOR';

    let companyIds: string[] = [];
    let vendedorIds: string[] = [];

    if (isAdminByType) {
      companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
      vendedorIds = requestedVendedorIds;
    } else if (isGestorByType) {
      companyIds = scope.companyId ? [scope.companyId] : resolveScopedCompanyIds(scope, requestedCompanyId);
      vendedorIds = requestedVendedorIds.length > 0
        ? requestedVendedorIds
        : await fetchGestorCompanyScopeIds(client, { companyIds });
    } else if (isMasterByType) {
      companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
      const allowedMasterIds = await fetchGestorCompanyScopeIds(client, { companyIds });

      if (requestedVendedorIds.length > 0) {
        vendedorIds = requestedVendedorIds.filter((id) => allowedMasterIds.includes(id));
      } else {
        vendedorIds = allowedMasterIds;
      }
    } else {
      companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
      vendedorIds = [scope.userId];
    }

    const accessibleClientIds = !scope.isAdmin
      ? await resolveAccessibleClientIds(client, { companyIds, vendedorIds })
      : [];
    const canOperacao = scope.isAdmin || hasModuloAccess(scope, ['operacao'], 1);
    const canConsultoria = scope.isAdmin || hasModuloAccess(scope, ['consultoria_online', 'consultoria'], 1);

    const scopeVendedorIds = new Set(vendedorIds.map((id) => String(id || '').trim()).filter(Boolean));
    const vendasKpis = await fetchAndComputeVendasKpis(client, {
      dataInicio: inicio,
      dataFim: fim,
      companyIds,
      vendedorIds,
      accessibleClientIds
    });

    // -------------------------------------------------------------------------
    // 1. Busca vendas do vendedor
    // -------------------------------------------------------------------------
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
          data_venda,
          valor_total,
          valor_taxas,
          valor_du,
          valor_rav,
          tipo_produtos (id, nome, tipo),
          produto_resolvido:produtos!produto_resolvido_id (id, nome),
          rateio:vendas_recibos_rateio (
            ativo,
            vendedor_origem_id,
            vendedor_destino_id,
            percentual_origem,
            percentual_destino
          )
        )
      `)
      .eq('cancelada', false)
      .order('data_venda', { ascending: true })
      .limit(5000);

    if (companyIds.length > 0) salesQuery = salesQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) salesQuery = salesQuery.in('vendedor_id', vendedorIds);

    const { data: salesData, error: salesError } = await salesQuery;
    if (salesError) throw salesError;

    let sales = (salesData || []) as DashboardVendaRow[];

    // -------------------------------------------------------------------------
    // 2. Inclui vendas onde o usuário é destino de rateio (split)
    // -------------------------------------------------------------------------
    if (vendedorIds.length > 0) {
      try {
        let rateioQuery = client
          .from('vendas_recibos_rateio')
          .select('venda_recibo_id')
          .eq('ativo', true)
          .in('vendedor_destino_id', vendedorIds)
          .not('venda_recibo_id', 'is', null);

        if (companyIds.length > 0) rateioQuery = rateioQuery.in('company_id', companyIds);

        const { data: rateioRows, error: rateioErr } = await rateioQuery;
        if (!rateioErr && rateioRows?.length > 0) {
          const splitReciboIds = Array.from(new Set(
            (rateioRows as any[]).map((r) => String(r?.venda_recibo_id || '').trim()).filter(Boolean)
          ));

          if (splitReciboIds.length > 0) {
            const { data: recibosData, error: recibosErr } = await client
              .from('vendas_recibos')
              .select('id, venda_id')
              .in('id', splitReciboIds);

            if (!recibosErr && recibosData?.length > 0) {
              const splitVendaIds = Array.from(new Set(
                (recibosData as any[]).map((r) => String(r?.venda_id || '').trim()).filter(Boolean)
              ));
              const existingIds = new Set(sales.map((s) => s.id));
              const newVendaIds = splitVendaIds.filter((id) => !existingIds.has(id));

              if (newVendaIds.length > 0) {
                const { data: extraSales, error: extraErr } = await client
                  .from('vendas')
                  .select(`
                    id, vendedor_id, cliente_id, company_id, data_venda, data_embarque, data_final,
                    valor_total, valor_taxas, cancelada,
                    clientes:cliente_id (id, nome),
                    destinos:produtos!destino_id (nome),
                    destino_cidade:cidades!destino_cidade_id (id, nome),
                    recibos:vendas_recibos (
                      id, data_venda, valor_total, valor_taxas, valor_du, valor_rav,
                      tipo_produtos (id, nome, tipo),
                      produto_resolvido:produtos!produto_resolvido_id (id, nome),
                      rateio:vendas_recibos_rateio (
                        ativo, vendedor_origem_id, vendedor_destino_id, percentual_origem, percentual_destino
                      )
                    )
                  `)
                  .in('id', newVendaIds)
                  .eq('cancelada', false);

                if (!extraErr && extraSales) {
                  sales = [...sales, ...(extraSales as DashboardVendaRow[])];
                }
              }
            }
          }
        }
      } catch {
        // best-effort
      }
    }

    // -------------------------------------------------------------------------
    // 3. Verifica se empresa tem conciliacao_sobrepoe_vendas e busca overrides
    // -------------------------------------------------------------------------
    const conciliacaoCompanyIds = await fetchConciliacaoSobrepoePorCompany(client, companyIds);
    let conciliacaoOverrides = new Map<string, { valorBruto: number; valorTaxas: number; dataVenda: string; isSeguro: boolean }>();

    if (conciliacaoCompanyIds.size > 0) {
      const overrideCompanyIds = Array.from(conciliacaoCompanyIds);

      // Coleta todos os recibo IDs que já temos no escopo para filtrar a consulta de conciliação
      const allReciboIds: string[] = [];
      sales.forEach((venda) => {
        if (!conciliacaoCompanyIds.has(String(venda.company_id || ''))) return;
        getReceipts(venda).forEach((recibo) => {
          const id = String(recibo?.id || '').trim();
          if (id) allReciboIds.push(id);
        });
      });

      conciliacaoOverrides = await fetchConciliacaoOverrides(
        client,
        overrideCompanyIds,
        inicio,
        fim,
        allReciboIds
      );

      // Aplica os overrides nos recibos correspondentes
      if (conciliacaoOverrides.size > 0) {
        sales = sales.map((venda) => {
          const recibos = getReceipts(venda);
          if (recibos.length === 0) return venda;

          const updatedRecibos = recibos.map((recibo) => {
            const reciboId = String(recibo?.id || '').trim();
            if (!reciboId) return recibo;
            const override = conciliacaoOverrides.get(reciboId);
            if (!override) return recibo;
            return {
              ...recibo,
              _conciliacao_valor_bruto: override.valorBruto,
              _conciliacao_valor_taxas: override.valorTaxas,
              _conciliacao_data_venda: override.dataVenda,
              _conciliacao_is_seguro: override.isSeguro
            };
          });

          return { ...venda, recibos: updatedRecibos };
        });
      }
    }

    // -------------------------------------------------------------------------
    // 4. Agrega por recibo no período
    // -------------------------------------------------------------------------
    let totalVendas = 0;
    let totalTaxas = 0;
    let totalSeguro = 0;
    let qtdVendas = 0;

    const timelineMap = new Map<string, number>();
    const destinoMap = new Map<string, number>();
    const destinoCountMap = new Map<string, number>();
    const produtoMap = new Map<string, { id: string; name: string; value: number }>();

    sales.forEach((row) => {
      const vendedorId = String(row.vendedor_id || '');
      const vendaDate = toDateKey(row.data_venda);
      const destinoNome = String(row.destinos?.nome || row.destino_cidade?.nome || 'Destino nao informado');
      const recibos = getReceipts(row);

      if (recibos.length === 0) {
        if (!isInRange(vendaDate, inicio, fim)) return;
        const valorTotal = toNum(row.valor_total);
        if (valorTotal <= 0) return;
        totalVendas += valorTotal;
        totalTaxas += toNum(row.valor_taxas);
        qtdVendas += 1;
        if (vendaDate) timelineMap.set(vendaDate, (timelineMap.get(vendaDate) || 0) + valorTotal);
        destinoMap.set(destinoNome, (destinoMap.get(destinoNome) || 0) + valorTotal);
        destinoCountMap.set(destinoNome, (destinoCountMap.get(destinoNome) || 0) + 1);
        const cur = produtoMap.get('sem-produto') || { id: 'sem-produto', name: 'Produto', value: 0 };
        produtoMap.set('sem-produto', { ...cur, value: cur.value + valorTotal });
        return;
      }

      // Filtra recibos pelo período — usa data de conciliação se houver override, senão data do recibo
      const recibosPeriodo = recibos.filter((recibo) => {
        const reciboDate = recibo._conciliacao_data_venda || toDateKey(recibo.data_venda) || vendaDate;
        return isInRange(reciboDate, inicio, fim);
      });

      if (recibosPeriodo.length === 0) return;

      let countedVenda = false;

      recibosPeriodo.forEach((recibo) => {
        const reciboDate = recibo._conciliacao_data_venda || toDateKey(recibo.data_venda) || vendaDate;
        const allocations = getReciboAllocations(recibo, vendedorId, scopeVendedorIds);
        if (allocations.length === 0) return;
        let countedDestino = false;

        // Usa valores de conciliação como override se disponível
        const bruto = recibo._conciliacao_valor_bruto != null
          ? recibo._conciliacao_valor_bruto
          : toNum(recibo.valor_total);
        const taxas = recibo._conciliacao_valor_taxas != null
          ? recibo._conciliacao_valor_taxas
          : toNum(recibo.valor_taxas) + toNum(recibo.valor_du) + toNum(recibo.valor_rav);

        allocations.forEach((alloc) => {
          const brutoAlloc = bruto * alloc.fator;
          const taxasAlloc = taxas * alloc.fator;

          if (brutoAlloc <= 0 && taxasAlloc <= 0) return;

          totalVendas += brutoAlloc;
          totalTaxas += taxasAlloc;

          if (!countedVenda) {
            qtdVendas += 1;
            countedVenda = true;
          }

          if (reciboDate) timelineMap.set(reciboDate, (timelineMap.get(reciboDate) || 0) + brutoAlloc);
          destinoMap.set(destinoNome, (destinoMap.get(destinoNome) || 0) + brutoAlloc);
          countedDestino = true;

          if (isSeguro(recibo)) totalSeguro += brutoAlloc;

          const productId = String(recibo?.tipo_produtos?.id || recibo?.produto_resolvido?.id || 'sem-produto');
          const productName = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || 'Produto');
          const curProd = produtoMap.get(productId) || { id: productId, name: productName, value: 0 };
          produtoMap.set(productId, { ...curProd, value: curProd.value + brutoAlloc });
        });

        if (countedDestino) {
          destinoCountMap.set(destinoNome, (destinoCountMap.get(destinoNome) || 0) + 1);
        }
      });
    });

    // -------------------------------------------------------------------------
    // 5. Metas
    // -------------------------------------------------------------------------
    let metasQuery = client
      .from('metas_vendedor')
      .select('id, vendedor_id, periodo, meta_geral, meta_diferenciada, ativo, scope')
      .eq('ativo', true)
      .gte('periodo', inicio)
      .lte('periodo', fim)
      .limit(500);

    if (vendedorIds.length > 0) metasQuery = metasQuery.in('vendedor_id', vendedorIds);

    const { data: metasData, error: metasError } = await metasQuery;
    if (metasError) throw metasError;

    // -------------------------------------------------------------------------
    // 6. Orçamentos
    // -------------------------------------------------------------------------
    let orcamentos: DashboardQuoteRow[] = [];

    if (includeOrcamentos) {
      let quotesQuery = client
        .from('quote')
        .select(`
          id, created_at, status, status_negociacao, total, client_id,
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
        const clientIds = await resolveAccessibleClientIds(client, { companyIds, vendedorIds: [] });

        if (clientIds.length === 0) {
          return json({
            inicio, fim,
            userCtx: { usuarioId: user.id, nome: scope.nome, papel: responsePapel, vendedorIds },
            podeVerOperacao: canOperacao,
            podeVerConsultoria: canConsultoria,
            vendasAgg: {
              totalVendas: vendasKpis.totalVendas,
              totalTaxas: vendasKpis.totalTaxas,
              totalLiquido: vendasKpis.totalLiquido,
              totalSeguro: vendasKpis.totalSeguro,
              qtdVendas: vendasKpis.countAtivas,
              ticketMedio: vendasKpis.countAtivas > 0 ? vendasKpis.totalVendas / vendasKpis.countAtivas : 0,
              timeline: Array.from(timelineMap.entries()).map(([date, value]) => ({ date, value })),
              topDestinos: Array.from(destinoMap.entries())
                .map(([name, value]) => ({ name, value, count: destinoCountMap.get(name) || 0 }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5),
              porProduto: Array.from(produtoMap.values()).sort((a, b) => b.value - a.value).slice(0, 6)
            },
            metas: metasData || [], orcamentos: [], widgetPrefs: []
          });
        }

        quotesQuery = quotesQuery.in('client_id', clientIds);
      }

      const { data: quotesData, error: quotesError } = await quotesQuery;
      if (quotesError) throw quotesError;
      orcamentos = (quotesData || []) as DashboardQuoteRow[];
    }

    // -------------------------------------------------------------------------
    // 7. Widget prefs
    // -------------------------------------------------------------------------
    const { data: widgetPrefsData } = await client
      .from('dashboard_widgets')
      .select('widget, ordem, visivel, settings')
      .eq('usuario_id', user.id)
      .order('ordem', { ascending: true })
      .limit(100);

    return json({
      inicio, fim,
      userCtx: { usuarioId: user.id, nome: scope.nome, papel: responsePapel, vendedorIds },
      podeVerOperacao: canOperacao,
      podeVerConsultoria: canConsultoria,
      vendasAgg: {
        totalVendas: vendasKpis.totalVendas,
        totalTaxas: vendasKpis.totalTaxas,
        totalLiquido: vendasKpis.totalLiquido,
        totalSeguro: vendasKpis.totalSeguro,
        qtdVendas: vendasKpis.countAtivas,
        ticketMedio: vendasKpis.countAtivas > 0 ? vendasKpis.totalVendas / vendasKpis.countAtivas : 0,
        timeline: Array.from(timelineMap.entries()).map(([date, value]) => ({ date, value })),
        topDestinos: Array.from(destinoMap.entries())
          .map(([name, value]) => ({ name, value, count: destinoCountMap.get(name) || 0 }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
        porProduto: Array.from(produtoMap.values()).sort((a, b) => b.value - a.value).slice(0, 6)
      },
      metas: metasData || [],
      orcamentos,
      widgetPrefs: widgetPrefsData || []
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar dashboard.');
  }
}
