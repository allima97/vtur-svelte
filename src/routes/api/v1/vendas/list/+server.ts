import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  normalizeText,
  parseIntSafe,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

type VendaStatus = 'confirmada' | 'pendente' | 'cancelada' | 'concluida';
type VendaTipo = 'pacote' | 'hotel' | 'passagem' | 'servico';

type VendaRow = {
  id: string;
  numero_venda: string | null;
  vendedor_id: string | null;
  cliente_id: string | null;
  company_id: string | null;
  data_venda: string | null;
  data_embarque: string | null;
  data_final: string | null;
  valor_total: number | null;
  valor_total_bruto: number | null;
  valor_taxas: number | null;
  cancelada: boolean | null;
  clientes?: { nome?: string | null; whatsapp?: string | null } | null;
  vendedor?: { nome_completo?: string | null } | null;
  destino_cidade?: { id?: string | null; nome?: string | null } | null;
  destinos?: { nome?: string | null; cidade_id?: string | null } | null;
  recibos?: Array<{
    id?: string | null;
    numero_recibo?: string | null;
    numero_reserva?: string | null;
    destino_cidade?: { id?: string | null; nome?: string | null } | null;
    tipo_pacote?: string | null;
    valor_total?: number | null;
    valor_taxas?: number | null;
    valor_du?: number | null;
    valor_rav?: number | null;
    data_inicio?: string | null;
    data_fim?: string | null;
    tipo_produtos?: { id?: string | null; nome?: string | null; tipo?: string | null } | null;
    produto_resolvido?: { id?: string | null; nome?: string | null } | null;
  }> | null;
};

type VendaItem = {
  id: string;
  codigo: string;
  cliente: string;
  cliente_id: string;
  vendedor_id: string;
  destino: string;
  destino_cidade: string;
  data_venda: string | null;
  data_embarque: string | null;
  data_final: string | null;
  valor_total: number;
  valor_total_bruto: number;
  valor_taxas: number;
  status: VendaStatus;
  vendedor: string;
  tipo: VendaTipo;
  recibos: string[];
  produtos: string[];
  conciliado: boolean | null;
  total_seguro: number;
  created_at?: string | null;
};

type CampoBusca = 'todos' | 'cliente' | 'vendedor' | 'destino' | 'produto' | 'recibo';

function deriveVendaStatus(row: VendaRow): VendaStatus {
  if (row.cancelada) return 'cancelada';
  const todayIso = new Date().toISOString().slice(0, 10);
  if (row.data_final && row.data_final < todayIso) return 'concluida';
  if (row.data_embarque && row.data_embarque >= todayIso) return 'confirmada';
  return 'pendente';
}

function deriveVendaTipo(row: VendaRow): VendaTipo {
  const firstReceipt = Array.isArray(row.recibos) ? row.recibos[0] : null;
  const reference = normalizeText(
    [firstReceipt?.tipo_pacote, firstReceipt?.tipo_produtos?.nome, firstReceipt?.tipo_produtos?.tipo].join(' ')
  );

  if (reference.includes('seguro') || reference.includes('servico')) return 'servico';
  if (reference.includes('hotel') || reference.includes('resort')) return 'hotel';
  if (
    reference.includes('passagem') ||
    reference.includes('aereo') ||
    reference.includes('fretamento') ||
    reference.includes('transporte')
  ) return 'passagem';
  return 'pacote';
}

function getReceipts(row: VendaRow) {
  return Array.isArray(row.recibos) ? row.recibos : [];
}

function deriveValorTotal(row: VendaRow) {
  const recibos = getReceipts(row);
  if (recibos.length > 0) {
    const totalRecibos = recibos.reduce((sum, recibo) => sum + Number(recibo?.valor_total || 0), 0);
    if (totalRecibos > 0) return totalRecibos;
  }
  return Number(row.valor_total || 0);
}

function deriveValorTotalBruto(row: VendaRow) {
  const valorBruto = Number(row.valor_total_bruto || 0);
  if (valorBruto > 0) return valorBruto;
  return deriveValorTotal(row);
}

function deriveValorTaxas(row: VendaRow) {
  const recibos = getReceipts(row);
  const taxasRecibos = recibos.reduce((sum, recibo) => {
    return sum + Number(recibo?.valor_taxas || 0) + Number(recibo?.valor_du || 0) + Number(recibo?.valor_rav || 0);
  }, 0);
  const valorTaxasBase = Number(row.valor_taxas || 0);
  return valorTaxasBase > 0 ? valorTaxasBase : taxasRecibos;
}

function deriveConciliado(row: VendaRow): boolean | null {
  const recibos = getReceipts(row);
  if (recibos.length === 0) return null;
  const allPositive = recibos.every((recibo) => Number(recibo?.valor_total || 0) > 0);
  return allPositive;
}

function formatVendaItem(row: VendaRow): VendaItem {
  const recibos = getReceipts(row);
  const totalSeguro = recibos.reduce((sum, recibo) => {
    const tipo = String(recibo?.tipo_produtos?.tipo || '').toLowerCase();
    const nome = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || '').toLowerCase();
    const isSeguro = tipo.includes('seguro') || nome.includes('seguro');
    return sum + (isSeguro ? Number(recibo?.valor_total || 0) : 0);
  }, 0);
  const produtos = recibos
    .map((recibo) => String(recibo?.produto_resolvido?.nome || recibo?.tipo_produtos?.nome || '').trim())
    .filter(Boolean);
  const destinoNome = String(row.destinos?.nome || '').trim();
  const cidadeDestino = String(row.destino_cidade?.nome || '').trim();
  const cidadesRecibos = Array.from(
    new Set(
      recibos
        .map((recibo) => String(recibo?.destino_cidade?.nome || '').trim())
        .filter(Boolean)
    )
  );
  const destinoDisplay = cidadesRecibos.join(', ') || cidadeDestino || destinoNome || 'Destino nao informado';

  return {
    id: row.id,
    codigo: String(row.numero_venda || '').trim() || `VD-${row.id.slice(0, 8).toUpperCase()}`,
    cliente: String(row.clientes?.nome || 'Cliente sem nome'),
    cliente_id: String(row.cliente_id || ''),
    vendedor_id: String(row.vendedor_id || ''),
    destino: destinoDisplay,
    destino_cidade: cidadeDestino || '-',
    data_venda: row.data_venda,
    data_embarque: row.data_embarque,
    data_final: row.data_final,
    valor_total: deriveValorTotal(row),
    valor_total_bruto: deriveValorTotalBruto(row),
    valor_taxas: deriveValorTaxas(row),
    status: deriveVendaStatus(row),
    vendedor: String(row.vendedor?.nome_completo || 'Equipe VTUR'),
    tipo: deriveVendaTipo(row),
    recibos: recibos
      .map((recibo) => String(recibo?.numero_recibo || recibo?.numero_reserva || '').trim())
      .filter(Boolean),
    produtos,
    conciliado: deriveConciliado(row),
    total_seguro: totalSeguro
  };
}

function matchesBusca(item: VendaItem, busca: string, campo: CampoBusca) {
  if (!busca) return true;
  const query = normalizeText(busca);
  const matchCliente = normalizeText(item.cliente).includes(query);
  const matchVendedor = normalizeText(item.vendedor).includes(query);
  const matchDestino = normalizeText([item.destino, item.destino_cidade].join(' ')).includes(query);
  const matchProduto = item.produtos.some((produto) => normalizeText(produto).includes(query));
  const matchRecibo = item.recibos.some((recibo) => normalizeText(recibo).includes(query));

  switch (campo) {
    case 'cliente': return matchCliente;
    case 'vendedor': return matchVendedor;
    case 'destino': return matchDestino;
    case 'produto': return matchProduto;
    case 'recibo': return matchRecibo;
    default:
      return matchCliente || matchVendedor || matchDestino || matchProduto || matchRecibo || normalizeText(item.codigo).includes(query);
  }
}

function computeKpisFromRows(rows: VendaRow[]) {
  let totalVendas = 0;
  let totalTaxas = 0;
  let totalSeguro = 0;

  for (const row of rows) {
    const recibos = getReceipts(row);
    if (recibos.length > 0) {
      totalVendas += recibos.reduce((sum, recibo) => sum + Number(recibo?.valor_total || 0), 0);
      totalTaxas += recibos.reduce(
        (sum, recibo) => sum + Number(recibo?.valor_taxas || 0) + Number(recibo?.valor_du || 0) + Number(recibo?.valor_rav || 0),
        0
      );
      totalSeguro += recibos.reduce((sum, recibo) => {
        const tipo = String(recibo?.tipo_produtos?.tipo || '').toLowerCase();
        const nome = String(recibo?.tipo_produtos?.nome || recibo?.produto_resolvido?.nome || '').toLowerCase();
        const isSeguro = tipo.includes('seguro') || nome.includes('seguro');
        return sum + (isSeguro ? Number(recibo?.valor_total || 0) : 0);
      }, 0);
      continue;
    }

    totalVendas += Number(row.valor_total || 0);
    totalTaxas += Number(row.valor_taxas || 0);
  }

  return {
    totalVendas,
    totalTaxas,
    totalLiquido: totalVendas - totalTaxas,
    totalSeguro
  };
}

async function hydrateDestinosFromVendaIds(client: ReturnType<typeof getAdminClient>, rows: VendaRow[]) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const vendaIds = Array.from(new Set(rows.map((row) => String(row?.id || '').trim()).filter(Boolean)));
  if (vendaIds.length === 0) return;

  try {
    const { data: vendaDestinos, error: vendaDestinosError } = await client
      .from('vendas')
      .select('id, destino_id, destino_cidade_id')
      .in('id', vendaIds)
      .limit(Math.max(500, vendaIds.length));

    if (vendaDestinosError) {
      console.warn('[vendas/list] could not load venda destino ids for hydration', vendaDestinosError);
      return;
    }

    const destinoByVendaId = new Map<string, { destino_id: string; destino_cidade_id: string }>();
    for (const row of (vendaDestinos || []) as any[]) {
      const id = String(row?.id || '').trim();
      if (!id) continue;
      destinoByVendaId.set(id, {
        destino_id: String(row?.destino_id || '').trim(),
        destino_cidade_id: String(row?.destino_cidade_id || '').trim()
      });
    }

    const produtoIds = Array.from(new Set(Array.from(destinoByVendaId.values()).map((row) => row.destino_id).filter(Boolean)));
    const cidadeIds = Array.from(
      new Set(
        Array.from(destinoByVendaId.values())
          .flatMap((row) => [row.destino_cidade_id])
          .filter(Boolean)
      )
    );

    const [produtosResult, cidadesResult] = await Promise.all([
      produtoIds.length > 0
        ? client.from('produtos').select('id, nome, cidade_id').in('id', produtoIds).limit(Math.max(500, produtoIds.length))
        : Promise.resolve({ data: [], error: null } as any),
      cidadeIds.length > 0
        ? client.from('cidades').select('id, nome').in('id', cidadeIds).limit(Math.max(500, cidadeIds.length))
        : Promise.resolve({ data: [], error: null } as any)
    ]);

    if (produtosResult.error) {
      console.warn('[vendas/list] could not load produtos for destino hydration', produtosResult.error);
    }
    if (cidadesResult.error) {
      console.warn('[vendas/list] could not load cidades for destino hydration', cidadesResult.error);
    }

    const produtosById = new Map<string, { nome: string; cidade_id: string }>();
    for (const row of (produtosResult.data || []) as any[]) {
      const id = String(row?.id || '').trim();
      if (!id) continue;
      produtosById.set(id, {
        nome: String(row?.nome || '').trim(),
        cidade_id: String(row?.cidade_id || '').trim()
      });
    }

    const cidadesById = new Map<string, string>();
    for (const row of (cidadesResult.data || []) as any[]) {
      const id = String(row?.id || '').trim();
      if (!id) continue;
      cidadesById.set(id, String(row?.nome || '').trim());
    }

    rows.forEach((row) => {
      if (row.destinos?.nome && row.destino_cidade?.nome) return;

      const destino = destinoByVendaId.get(String(row.id || '').trim());
      if (!destino) return;

      const produto = destino.destino_id ? produtosById.get(destino.destino_id) : null;
      if (!row.destinos?.nome && produto?.nome) {
        row.destinos = {
          nome: produto.nome,
          cidade_id: produto.cidade_id || null
        };
      }

      const cidadeId = destino.destino_cidade_id || produto?.cidade_id || '';
      const cidadeNome = cidadeId ? cidadesById.get(cidadeId) : '';
      if (!row.destino_cidade?.nome && cidadeNome) {
        row.destino_cidade = {
          id: cidadeId,
          nome: cidadeNome
        };
      }
    });
  } catch (err) {
    console.warn('[vendas/list] destino hydration skipped due to runtime error', err);
  }
}

async function fetchVendaRowsWithFallback(
  client: ReturnType<typeof getAdminClient>,
  params: {
    openId: string;
    inicio: string;
    fim: string;
    companyIds: string[];
    vendedorIds: string[];
    clienteId: string;
    scopeIsAdmin: boolean;
    accessibleClientIds: string[];
  }
) {
  const buildBaseQuery = (selectClause: string) => {
    let query = client
      .from('vendas')
      .select(selectClause)
      .order('data_venda', { ascending: false })
      .limit(5000);

    if (params.openId) query = query.eq('id', params.openId);
    if (params.inicio) query = query.gte('data_venda', params.inicio);
    if (params.fim) query = query.lte('data_venda', params.fim);
    if (params.companyIds.length > 0) query = query.in('company_id', params.companyIds);
    if (params.vendedorIds.length > 0) query = query.in('vendedor_id', params.vendedorIds);
    if (params.clienteId) query = query.eq('cliente_id', params.clienteId);
    else if (!params.scopeIsAdmin && params.accessibleClientIds.length > 0) {
      query = query.in('cliente_id', params.accessibleClientIds);
    }

    return query;
  };

  const enrichedSelect = `
    id,
    numero_venda,
    vendedor_id,
    cliente_id,
    company_id,
    data_venda,
    data_embarque,
    data_final,
    valor_total,
    valor_total_bruto,
    valor_taxas,
    cancelada,
    clientes (nome, whatsapp),
    vendedor:users!vendedor_id (nome_completo),
    destino_cidade:cidades!destino_cidade_id (id, nome),
    destinos:produtos!destino_id (nome, cidade_id),
    recibos:vendas_recibos (
      id,
      numero_recibo,
      numero_reserva,
      destino_cidade:cidades!destino_cidade_id (id, nome),
      tipo_pacote,
      valor_total,
      valor_taxas,
      valor_du,
      valor_rav,
      data_inicio,
      data_fim,
      tipo_produtos (id, nome, tipo),
      produto_resolvido:produtos!produto_resolvido_id (id, nome)
    )
  `;

  const enrichedResult = await buildBaseQuery(enrichedSelect);
  if (!enrichedResult.error) {
    return Array.isArray(enrichedResult.data) ? (enrichedResult.data as unknown as VendaRow[]) : [];
  }

  console.warn('[vendas/list] enriched select failed, falling back to minimal select', enrichedResult.error);

  const fallbackSelect = `
    id,
    numero_venda,
    vendedor_id,
    cliente_id,
    company_id,
    data_venda,
    data_embarque,
    data_final,
    valor_total,
    valor_taxas,
    cancelada,
    clientes (nome),
    destino_cidade:cidades!vendas_destino_cidade_id_fkey (id, nome),
    destinos:produtos!vendas_destino_id_fkey (nome, cidade_id),
    recibos:vendas_recibos (
      id,
      numero_recibo,
      numero_reserva,
      tipo_pacote,
      valor_total,
      valor_taxas,
      valor_du,
      valor_rav,
      data_inicio,
      data_fim
    )
  `;

  const fallbackResult = await buildBaseQuery(fallbackSelect);
  if (!fallbackResult.error) {
    return Array.isArray(fallbackResult.data) ? (fallbackResult.data as unknown as VendaRow[]) : [];
  }

  console.warn('[vendas/list] FK fallback failed, trying legacy fallback select', fallbackResult.error);

  const legacyFallbackSelect = `
    id,
    numero_venda,
    vendedor_id,
    cliente_id,
    company_id,
    data_venda,
    data_embarque,
    data_final,
    valor_total,
    valor_taxas,
    cancelada,
    clientes (nome),
    recibos:vendas_recibos (
      id,
      numero_recibo,
      numero_reserva,
      tipo_pacote,
      valor_total,
      valor_taxas,
      valor_du,
      valor_rav,
      data_inicio,
      data_fim
    )
  `;

  const legacyFallbackResult = await buildBaseQuery(legacyFallbackSelect);
  if (legacyFallbackResult.error) {
    console.error('[vendas/list] legacy fallback failed, returning empty list', legacyFallbackResult.error);
    return [];
  }

  return Array.isArray(legacyFallbackResult.data) ? (legacyFallbackResult.data as unknown as VendaRow[]) : [];
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 1, 'Sem acesso a Vendas.');
    }

    const { searchParams } = event.url;
    const inicio = String(searchParams.get('inicio') || '').trim();
    const fim = String(searchParams.get('fim') || '').trim();
    const page = parseIntSafe(searchParams.get('page'), 1);
    const pageSize = Math.min(200, parseIntSafe(searchParams.get('pageSize'), 20));
    const all = String(searchParams.get('all') || '').trim() === '1';
    const openId = String(searchParams.get('id') || '').trim();
    const includeKpis = String(searchParams.get('include_kpis') || '').trim() === '1' || String(searchParams.get('kpis') || '').trim() === '1';
    const includeVendedores = String(searchParams.get('include_vendedores') || '').trim() === '1';
    const searchQuery = String(searchParams.get('q') || '').trim();
    const campoBusca = (String(searchParams.get('campo') || 'todos').trim().toLowerCase() || 'todos') as CampoBusca;
    const statusQuery = String(searchParams.get('status') || '').trim().toLowerCase();
    const tipoQuery = String(searchParams.get('tipo') || '').trim().toLowerCase();
    const clienteId = String(searchParams.get('cliente_id') || '').trim();
    const requestedCompanyId = searchParams.get('company_id') || searchParams.get('empresa_id');
    const requestedVendedorRaw = searchParams.get('vendedor_ids') || searchParams.get('vendedor_id');
    const companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
    const vendedorIds = await resolveScopedVendedorIds(client, scope, requestedVendedorRaw);

    const accessibleClientIds = !scope.isAdmin ? await resolveAccessibleClientIds(client, { companyIds, vendedorIds }) : [];

    const data = await fetchVendaRowsWithFallback(client, {
      openId,
      inicio,
      fim,
      companyIds,
      vendedorIds,
      clienteId,
      scopeIsAdmin: scope.isAdmin,
      accessibleClientIds
    });

    await hydrateDestinosFromVendaIds(client, data as VendaRow[]);

    const items = (data as VendaRow[])
      .map((row) => formatVendaItem(row))
      .filter((item) => (statusQuery ? item.status === statusQuery : true))
      .filter((item) => (tipoQuery ? item.tipo === tipoQuery : true))
      .filter((item) => matchesBusca(item, searchQuery, campoBusca));

    const payloadItems = all || openId ? items : items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

    let vendedores: Array<{ id: string; nome_completo: string }> = [];
    if (includeVendedores) {
      let usersQuery = client
        .from('users')
        .select('id, nome_completo, user_types (name)')
        .limit(1000);

      if (!scope.isAdmin && companyIds.length > 0) {
        usersQuery = usersQuery.in('company_id', companyIds);
      }

      const { data: usersData } = await usersQuery;

      vendedores = ((usersData || []) as any[])
        .filter((row) => {
          const userType = Array.isArray(row?.user_types) ? row.user_types[0] : row?.user_types;
          const name = String(userType?.name || '').toUpperCase();
          return name.includes('VENDEDOR') || name.includes('GESTOR') || name.includes('MASTER') || name.includes('ADMIN');
        })
        .map((row) => ({
          id: String(row.id || ''),
          nome_completo: String(row.nome_completo || row.email || 'Usuário sem nome')
        }))
        .filter((row) => row.id)
        .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'));
    }

    return json({
      page,
      pageSize,
      total: items.length,
      items: payloadItems,
      ...(includeKpis ? { kpis: computeKpisFromRows(data as VendaRow[]) } : {}),
      ...(includeVendedores ? { vendedores } : {})
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar vendas.');
  }
}
