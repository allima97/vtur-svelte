import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserScope } from '$lib/server/v1';
import { isUuid, normalizeText, parseIntSafe } from '$lib/server/v1';

type QueryResult<T> = { data: T[] | null; error: any };

function isMissingColumnOrRelation(err: any) {
  const code = String(err?.code || '');
  const message = String(err?.message || '');
  return (
    code === '42703' ||
    code === 'PGRST200' ||
    code === 'PGRST205' ||
    message.includes('42703') ||
    message.includes('PGRST200') ||
    message.includes('PGRST205')
  );
}

async function optionalRows<T>(promise: PromiseLike<QueryResult<T>>) {
  const result = await promise;
  if (result.error) {
    if (isMissingColumnOrRelation(result.error)) return [] as T[];
    throw result.error;
  }
  return (result.data || []) as T[];
}

async function optionalSingle<T>(promise: PromiseLike<{ data: T | null; error: any }>) {
  const result = await promise;
  if (result.error) {
    if (isMissingColumnOrRelation(result.error)) return null;
    throw result.error;
  }
  return result.data || null;
}

export type ProdutoBaseItem = {
  id: string;
  nome: string;
  destino: string | null;
  cidade_id: string | null;
  tipo_produto: string | null;
  informacoes_importantes: string | null;
  atracao_principal: string | null;
  melhor_epoca: string | null;
  duracao_sugerida: string | null;
  nivel_preco: string | null;
  imagem_url: string | null;
  ativo: boolean | null;
  fornecedor_id?: string | null;
  circuito_id?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  todas_as_cidades: boolean;
  valor_neto?: number | null;
  margem?: number | null;
  valor_venda?: number | null;
  moeda?: string | null;
  cambio?: number | null;
  valor_em_reais?: number | null;
};

export type ProdutoTarifaItem = {
  id: string;
  acomodacao: string;
  qte_pax: number;
  tipo: string;
  validade_de: string | null;
  validade_ate: string | null;
  valor_neto: number;
  padrao: string;
  margem: number | null;
  valor_venda: number;
  moeda: string;
  cambio: number;
  valor_em_reais: number;
};

export async function fetchProdutosBase(
  client: SupabaseClient,
  scope: UserScope,
  params: URLSearchParams
) {
  const page = parseIntSafe(params.get('page'), 1);
  const pageSize = Math.min(200, parseIntSafe(params.get('pageSize'), 20));
  const all = String(params.get('all') || '').trim() === '1';
  const search = String(params.get('search') || '').trim();
  const tipoProdutoId = String(params.get('tipo_produto') || '').trim();
  const ativoRaw = String(params.get('ativo') || '').trim();
  const fornecedorId = String(params.get('fornecedor_id') || '').trim();

  let produtosQuery = client
    .from('produtos')
    .select(
      [
        'id',
        'nome',
        'destino',
        'cidade_id',
        'tipo_produto',
        'informacoes_importantes',
        'atracao_principal',
        'melhor_epoca',
        'duracao_sugerida',
        'nivel_preco',
        'imagem_url',
        'ativo',
        'fornecedor_id',
        'circuito_id',
        'created_at',
        'updated_at',
        'todas_as_cidades',
        'valor_neto',
        'margem',
        'valor_venda',
        'moeda',
        'cambio',
        'valor_em_reais'
      ].join(', '),
      { count: 'exact' }
    )
    .order(all || search ? 'nome' : 'created_at', { ascending: Boolean(all || search) });

  if (isUuid(tipoProdutoId)) produtosQuery = produtosQuery.eq('tipo_produto', tipoProdutoId);
  if (ativoRaw === 'true' || ativoRaw === 'false') produtosQuery = produtosQuery.eq('ativo', ativoRaw === 'true');
  if (isUuid(fornecedorId)) produtosQuery = produtosQuery.eq('fornecedor_id', fornecedorId);
  if (!all) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    produtosQuery = produtosQuery.range(from, to);
  }

  if (search) {
    const like = `%${search}%`;
    produtosQuery = produtosQuery.or(
      ['nome.ilike.' + like, 'destino.ilike.' + like, 'atracao_principal.ilike.' + like, 'melhor_epoca.ilike.' + like].join(',')
    );
  }

  const [
    paises,
    subdivisoes,
    tipos,
    produtosResp,
    destinosProdutos,
    cidadesComPais,
    cidadesBase,
    fornecedores
  ] = await Promise.all([
    optionalRows(client.from('paises').select('id, nome').order('nome')),
    optionalRows(client.from('subdivisoes').select('id, nome, codigo_admin1, pais_id').order('nome')),
    optionalRows(client.from('tipo_produtos').select('id, nome, tipo, ativo').eq('ativo', true).order('nome')),
    produtosQuery,
    optionalRows(
      client
        .from('produtos')
        .select('destino, atracao_principal, melhor_epoca')
        .order('destino', { ascending: true })
        .limit(1000)
    ),
    optionalRows(
      client
        .from('cidades')
        .select('id, nome, subdivisao_id, subdivisao:subdivisoes(id, nome, pais_id)')
        .order('nome', { ascending: true })
        .limit(5000)
    ),
    optionalRows(client.from('cidades').select('id, nome').order('nome', { ascending: true }).limit(5000)),
    scope.companyId
      ? optionalRows(
          client
            .from('fornecedores')
            .select('id, nome_completo, nome_fantasia')
            .eq('company_id', scope.companyId)
            .order('nome_fantasia', { ascending: true })
            .limit(2000)
        )
      : Promise.resolve([])
  ]);

  if (produtosResp.error) throw produtosResp.error;

  const cidadesMap = new Map<string, any>();
  cidadesBase.forEach((row: any) => cidadesMap.set(String(row.id), { ...row }));
  cidadesComPais.forEach((row: any) => {
    cidadesMap.set(String(row.id), {
      ...(cidadesMap.get(String(row.id)) || {}),
      ...row
    });
  });

  let produtos = ((produtosResp.data || []) as any[]).map((row) => ({
    ...row,
    todas_as_cidades: row?.todas_as_cidades === true || (!row?.cidade_id && row?.todas_as_cidades !== false)
  })) as ProdutoBaseItem[];

  if (search) {
    const term = normalizeText(search);
    produtos = produtos.filter((produto) => {
      const cidade = produto.cidade_id ? cidadesMap.get(produto.cidade_id) : null;
      const estado =
        cidade?.estado ||
        cidade?.uf ||
        cidade?.subdivisao_nome ||
        cidade?.subdivisao?.codigo_admin1 ||
        cidade?.subdivisao?.nome ||
        '';
      const pais = cidade?.pais || '';
      const tipo = tipos.find((item: any) => item.id === produto.tipo_produto);
      return [
        produto.nome,
        produto.destino,
        produto.atracao_principal,
        produto.melhor_epoca,
        cidade?.nome,
        estado,
        pais,
        tipo?.nome,
        tipo?.tipo
      ].some((value) => normalizeText(String(value || '')).includes(term));
    });
  }

  return {
    paises,
    subdivisoes,
    tipos,
    produtos,
    total: search || all ? produtos.length : produtosResp.count ?? produtos.length,
    destinosProdutos,
    cidades: Array.from(cidadesMap.values()),
    fornecedores
  };
}

export async function fetchProdutoById(client: SupabaseClient, id: string) {
  const base = await optionalSingle<any>(
    client
      .from('produtos')
      .select(
        [
          'id',
          'nome',
          'destino',
          'cidade_id',
          'tipo_produto',
          'informacoes_importantes',
          'atracao_principal',
          'melhor_epoca',
          'duracao_sugerida',
          'nivel_preco',
          'imagem_url',
          'ativo',
          'fornecedor_id',
          'circuito_id',
          'created_at',
          'updated_at',
          'todas_as_cidades',
          'valor_neto',
          'margem',
          'valor_venda',
          'moeda',
          'cambio',
          'valor_em_reais'
        ].join(', ')
      )
      .eq('id', id)
      .maybeSingle()
  );

  if (!base) return null;

  const [cidade, tipo, fornecedor, tarifas] = await Promise.all([
    base.cidade_id
      ? optionalSingle(
          client
            .from('cidades')
            .select('id, nome, subdivisao_id, subdivisao:subdivisoes(id, nome, pais_id)')
            .eq('id', base.cidade_id)
            .maybeSingle()
        )
      : Promise.resolve(null),
    base.tipo_produto
      ? optionalSingle(client.from('tipo_produtos').select('id, nome, tipo, ativo').eq('id', base.tipo_produto).maybeSingle())
      : Promise.resolve(null),
    base.fornecedor_id
      ? optionalSingle(client.from('fornecedores').select('id, nome_completo, nome_fantasia').eq('id', base.fornecedor_id).maybeSingle())
      : Promise.resolve(null),
    fetchProdutoTarifas(client, id)
  ]);

  return {
    ...base,
    todas_as_cidades: base?.todas_as_cidades === true || (!base?.cidade_id && base?.todas_as_cidades !== false),
    cidade,
    tipo,
    fornecedor,
    tarifas
  };
}

export async function fetchProdutoTarifas(client: SupabaseClient, produtoId: string) {
  if (!isUuid(produtoId)) return [] as ProdutoTarifaItem[];

  const rows = await optionalRows<any>(
    client
      .from('produtos_tarifas')
      .select(
        'id, acomodacao, qte_pax, tipo, validade_de, validade_ate, valor_neto, padrao, margem, valor_venda, moeda, cambio, valor_em_reais'
      )
      .eq('produto_id', produtoId)
      .order('validade_de', { ascending: true })
      .limit(500)
  );

  return rows.map((row: any) => ({
    id: String(row.id || ''),
    acomodacao: String(row.acomodacao || ''),
    qte_pax: Number(row.qte_pax || 0),
    tipo: String(row.tipo || ''),
    validade_de: row.validade_de || null,
    validade_ate: row.validade_ate || null,
    valor_neto: Number(row.valor_neto || 0),
    padrao: String(row.padrao || 'Padrao'),
    margem: row.margem == null ? null : Number(row.margem),
    valor_venda: Number(row.valor_venda || 0),
    moeda: String(row.moeda || 'USD'),
    cambio: Number(row.cambio || 1),
    valor_em_reais: Number(row.valor_em_reais || 0)
  })) as ProdutoTarifaItem[];
}

export function sanitizeProdutoPayload(body: any) {
  return {
    nome: String(body?.nome || '').trim(),
    destino: String(body?.destino || '').trim() || null,
    cidade_id: isUuid(body?.cidade_id) ? String(body.cidade_id) : null,
    tipo_produto: isUuid(body?.tipo_produto) ? String(body.tipo_produto) : null,
    atracao_principal: String(body?.atracao_principal || '').trim() || null,
    melhor_epoca: String(body?.melhor_epoca || '').trim() || null,
    duracao_sugerida: String(body?.duracao_sugerida || body?.duracao || '').trim() || null,
    nivel_preco: String(body?.nivel_preco || '').trim() || null,
    imagem_url: String(body?.imagem_url || '').trim() || null,
    informacoes_importantes: String(body?.informacoes_importantes || body?.descricao || '').trim() || null,
    ativo: body?.ativo !== false,
    fornecedor_id: isUuid(body?.fornecedor_id) ? String(body.fornecedor_id) : null,
    circuito_id: isUuid(body?.circuito_id) ? String(body.circuito_id) : null,
    todas_as_cidades: body?.todas_as_cidades === true,
    valor_neto: Number(body?.valor_neto || 0) || 0,
    margem: body?.margem == null || body?.margem === '' ? null : Number(body.margem),
    valor_venda: Number(body?.valor_venda || 0) || 0,
    moeda: String(body?.moeda || 'USD').trim() || 'USD',
    cambio: Number(body?.cambio || 1) || 1,
    valor_em_reais: Number(body?.valor_em_reais || 0) || 0
  };
}

function toNullableDate(value: unknown) {
  const raw = String(value || '').trim();
  return raw ? raw : null;
}

export function sanitizeTarifasPayload(produtoId: string, rawTarifas: unknown[]) {
  if (!isUuid(produtoId)) return [];

  return (Array.isArray(rawTarifas) ? rawTarifas : [])
    .map((item: any) => ({
      produto_id: produtoId,
      acomodacao: String(item?.acomodacao || '').trim(),
      qte_pax: Math.max(0, Math.trunc(Number(item?.qte_pax || 0) || 0)),
      tipo: String(item?.tipo || '').trim(),
      validade_de: toNullableDate(item?.validade_de),
      validade_ate: toNullableDate(item?.validade_ate),
      valor_neto: Number(item?.valor_neto || 0) || 0,
      padrao: String(item?.padrao || '').trim() === 'Manual' ? 'Manual' : 'Padrao',
      margem: item?.margem == null || item?.margem === '' ? null : Number(item.margem),
      valor_venda: Number(item?.valor_venda || 0) || 0,
      moeda: String(item?.moeda || 'USD').trim() || 'USD',
      cambio: Number(item?.cambio || 1) || 1,
      valor_em_reais: Number(item?.valor_em_reais || 0) || 0
    }))
    .filter((item) => item.acomodacao || item.tipo || item.valor_neto || item.valor_venda || item.validade_de || item.validade_ate)
    .slice(0, 400);
}
