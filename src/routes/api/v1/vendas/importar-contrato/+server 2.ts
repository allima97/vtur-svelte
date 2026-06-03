import { json, error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getAdminClient,
  ensureModuloAccess,
  requireAuthenticatedUser,
  resolveScopedCompanyId,
  resolveUserScope,
  sanitizePostgrestSearchTerm,
  toErrorResponse,
  isUuid
} from '$lib/server/v1';
import { normalizeText, titleCaseNome } from '$lib/normalizeText';
import type { ContratoDraft, PassageiroDraft, PagamentoDraft } from '$lib/vendas/contratoCvcExtractor';
import { ensureAssignableActiveSeller, ensureReciboReservaUnicos, calcularStatusPeriodo, markRankingReadModelDirty } from '$lib/server/vendasSave';
import { sanitizeImportedClienteNome } from '$lib/features/clientes/form';
import { todayISODateLocal } from '$lib/date';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import { invalidateSalesReadModels } from '$lib/server/readModelCache';
import { chunkArray, uniqueCleanStrings } from '$lib/utils/array';
import { toUserMessage } from '$lib/utils/errors';

const MAX_VENDA_IMPORTAR_CONTRATO_BODY_BYTES = 8 * 1024 * 1024;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type TermoNaoComissionavelRow = {
  termo: string | null;
  termo_normalizado: string | null;
  ativo: boolean | null;
};

type TipoProdutoLookup = {
  id: string;
  nome: string | null;
  tipo: string | null;
};

type ProdutoLookup = {
  id: string;
  nome: string | null;
  tipo_produto: string | null;
  cidade_id: string | null;
  todas_as_cidades: boolean | null;
};

type CidadeLookupRow = {
  id: string;
  nome: string | null;
};

type ProdutoCidadeLookupRow = {
  cidade_id: string | null;
  nome: string | null;
};

type ClienteLookupRow = {
  id: string;
  cpf: string | null;
  nome: string | null;
  nascimento: string | null;
  endereco: string | null;
  numero: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  rg: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
};

type ClienteUpdatePayload = {
  nome?: string;
  endereco?: string;
  numero?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  rg?: string;
};

type SellerScopeRow = {
  id: string;
  company_id: string | null;
};

type TargetSellerRow = SellerScopeRow & {
  active: boolean | null;
  uso_individual: boolean | null;
  user_types: { name: string | null } | { name: string | null }[] | null;
};

type ClienteContatoUpdatePayload = {
  telefone?: string;
  whatsapp?: string;
  email?: string;
};

type ContratoImportRow = ContratoDraft & {
  desconto_comercial?: number | null;
  destino_cidade_id?: string | null;
  produto_resolvido_id?: string | null;
  aplica_du?: boolean | null;
};

function textNoStore(message: string, status: number) {
  return new Response(message, { status, headers: NO_STORE_HEADERS });
}

function deriveVendaStatus(dataEmbarque?: string | null, dataFinal?: string | null): string {
  const hoje = todayISODateLocal();
  if (dataFinal && dataFinal < hoje) return 'concluida';
  if (dataEmbarque && dataEmbarque >= hoje) return 'confirmada';
  return 'pendente';
}

const DEFAULT_NAO_COMISSIONAVEIS = [
  'credito diversos',
  'credito pax',
  'credito passageiro',
  'credito de viagem',
  'credipax',
  'vale viagem',
  'carta de credito',
  'credito'
];

function isISODate(value?: string | null) {
  return ISO_DATE_PATTERN.test(String(value || '').trim());
}

function normalizeCpf(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function formatCpf(value: string) {
  const digits = normalizeCpf(value);
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function parseMoney(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return 0;
  return Number(value);
}

function getContratoValorDu(contrato: ContratoDraft, isFacialRextur: boolean) {
  if (isFacialRextur) return 0;
  return parseMoney(contrato.taxa_du);
}

function getContratoValorRavRac(contrato: ContratoDraft, isFacialRextur: boolean) {
  if (!isFacialRextur) return 0;
  return parseMoney(contrato.taxa_du) + parseMoney(contrato.rc);
}

function getContratoValorTotalRecibo(
  contrato: ContratoDraft,
  tipoImportacao: string,
) {
  const valorTotal = parseMoney(contrato.total_pago ?? contrato.total_bruto);
  const valorDu = parseMoney(contrato.taxa_du);
  const aplicaDu = (contrato as ContratoImportRow).aplica_du === true;

  if (tipoImportacao === 'facial_cvc' && valorDu > 0 && !aplicaDu) {
    return Math.max(0, valorTotal - valorDu);
  }

  return valorTotal;
}

function normalizeRexturLocalizador(value?: string | null) {
  return String(value || '')
    .trim()
    .replace(/^REXTUR[\s-]*/i, '')
    .toUpperCase();
}

function resolveContratoReciboNumeros(contrato: ContratoDraft, isFacialRextur: boolean) {
  if (!isFacialRextur) {
    return {
      numero_recibo: contrato.contrato_numero || null,
      numero_reserva: contrato.reserva_numero || null
    };
  }

  const localizador =
    normalizeRexturLocalizador(contrato.reserva_numero) ||
    normalizeRexturLocalizador(contrato.contrato_numero);

  return {
    numero_recibo: 'REXTUR',
    numero_reserva: localizador || null
  };
}

function sanitizeOptionalContact(value?: string | null) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function cleanImportedClienteNome(value?: string | null, fallback = 'Cliente sem nome') {
  return titleCaseNome(sanitizeImportedClienteNome(value)) || fallback;
}

function buildPagamentoKey(pagamento: PagamentoDraft) {
  const forma = normalizeText(pagamento.forma || '').toUpperCase();
  const valorRef =
    pagamento.total != null ? pagamento.total : pagamento.valor_bruto != null ? pagamento.valor_bruto : 0;
  const valor = Number(valorRef).toFixed(2);
  const parcelas = (pagamento.parcelas || [])
    .map((parcela) => {
      const numero = String(parcela.numero || '');
      const val = Number(parcela.valor).toFixed(2);
      const vencimento = parcela.vencimento || '';
      return `${numero}:${val}:${vencimento}`;
    })
    .join('|');
  return `${forma}|${valor}|${parcelas}`;
}

function dedupePagamentos(pagamentos: PagamentoDraft[]) {
  const seen = new Set<string>();
  const result: PagamentoDraft[] = [];
  for (const pagamento of pagamentos) {
    if (!pagamento?.forma) continue;
    const key = buildPagamentoKey(pagamento);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(pagamento);
  }
  return result;
}

function totalParcelasPagamento(pagamento: PagamentoDraft) {
  return (pagamento.parcelas || []).reduce((sum, parcela) => sum + parseMoney(parcela.valor), 0);
}

function inferPagamentoDesconto(valorBruto: number, parcelasTotal: number) {
  if (valorBruto <= 0 || parcelasTotal <= 0 || parcelasTotal >= valorBruto) return 0;
  return Number((valorBruto - parcelasTotal).toFixed(2));
}

function calcularTotalPagamentos(pagamentos: PagamentoDraft[]) {
  return pagamentos.reduce((acc, pagamento) => {
    const parcelasTotal = totalParcelasPagamento(pagamento);
    const bruto = parseMoney(pagamento.valor_bruto) || parcelasTotal;
    const desconto = parseMoney(pagamento.desconto) || inferPagamentoDesconto(bruto, parcelasTotal);
    const total = parseMoney(pagamento.total);
    if (pagamento.total != null && (bruto <= 0 || total <= bruto * 1.05)) {
      return acc + total;
    }
    if (parcelasTotal > 0 && bruto > parcelasTotal) return acc + parcelasTotal;
    if (bruto > 0) return acc + Math.max(bruto - desconto, 0);
    return acc;
  }, 0);
}

async function carregarTermosNaoComissionaveis(client: SupabaseClient): Promise<string[]> {
  try {
    const { data, error } = await client
      .from('parametros_pagamentos_nao_comissionaveis')
      .select('termo, termo_normalizado, ativo')
      .eq('ativo', true)
      .order('termo', { ascending: true });
    if (error) throw error;

    const termos = ((data || []) as TermoNaoComissionavelRow[])
      .map((row) => normalizeText(row.termo_normalizado || row.termo))
      .filter(Boolean);

    return termos.length > 0 ? uniqueCleanStrings(termos) : DEFAULT_NAO_COMISSIONAVEIS.map((termo) => normalizeText(termo));
  } catch {
    return DEFAULT_NAO_COMISSIONAVEIS.map((termo) => normalizeText(termo));
  }
}

function isFormaNaoComissionavel(nome?: string | null, termos?: string[]) {
  const normalized = normalizeText(nome || '');
  if (!normalized) return false;
  if (normalized.includes('cartao') && normalized.includes('credito')) return false;
  const base = termos && termos.length > 0 ? termos : DEFAULT_NAO_COMISSIONAVEIS.map((termo) => normalizeText(termo));
  return base.some((termo) => termo && normalized.includes(termo));
}

function isAllowedSellerTipo(tipoNome?: string | null) {
  const tipo = String(tipoNome || '').toUpperCase();
  return tipo.includes('VENDEDOR') || tipo.includes('GESTOR') || tipo.includes('MASTER');
}

function readUserTypeName(userTypes: TargetSellerRow['user_types']) {
  if (Array.isArray(userTypes)) return userTypes[0]?.name || null;
  return userTypes?.name || null;
}

function pickProdutoNome(contrato: ContratoDraft, fallbackDestino?: string | null) {
  const candidates = [
    contrato.produto_principal,
    contrato.produto_tipo,
    contrato.produto_detalhes,
    contrato.destino,
    fallbackDestino,
    'Produto'
  ];
  return String(candidates.find((value) => String(value || '').trim()) || 'Produto').trim();
}

function resolveTipoProdutoId(contrato: ContratoDraft, tipos: TipoProdutoLookup[]) {
  const normalized = normalizeText(
    [
      contrato.produto_principal,
      contrato.produto_tipo,
      contrato.produto_detalhes,
      contrato.tipo_pacote
    ]
      .filter(Boolean)
      .join(' ')
  );

  const matches = (patterns: string[]) =>
    tipos.find((tipo) => {
      const label = normalizeText(`${tipo.nome || ''} ${tipo.tipo || ''}`);
      return patterns.some((pattern) => label.includes(pattern));
    });

  if (normalized.includes('seguro')) return matches(['seguro'])?.id || null;
  if (normalized.includes('ingresso')) return matches(['ingresso'])?.id || null;
  if (normalized.includes('aereo') || normalized.includes('passagem')) {
    return matches(['aereo', 'passagem'])?.id || null;
  }
  if (normalized.includes('locacao') || normalized.includes('locadora') || normalized.includes('carro')) {
    return matches(['carro', 'locacao', 'locadora'])?.id || null;
  }
  if (normalized.includes('traslado') || normalized.includes('transfer') || normalized.includes('transporte') || normalized.includes('passeio')) {
    return matches(['servico', 'traslado', 'transfer', 'transporte', 'passeio'])?.id || null;
  }
  if (normalized.includes('hotel') || normalized.includes('hospedagem')) {
    return matches(['hotel', 'hospedagem'])?.id || null;
  }

  return tipos[0]?.id || null;
}

async function resolveProdutoOperacional(params: {
  client: SupabaseClient;
  contrato: ContratoDraft;
  produtoId?: string | null;
  cidadeId?: string | null;
  destinoNome?: string | null;
  tiposProduto: TipoProdutoLookup[];
}) {
  const { client, contrato, produtoId, cidadeId, destinoNome, tiposProduto } = params;
  const existingId = String(produtoId || '').trim();
  if (isUuid(existingId)) {
    const { data, error } = await client
      .from('produtos')
      .select('id, nome, tipo_produto, cidade_id, todas_as_cidades')
      .eq('id', existingId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data as ProdutoLookup;
  }

  const nome = titleCaseNome(pickProdutoNome(contrato, destinoNome));
  const nomeBusca = sanitizePostgrestSearchTerm(nome, 160);
  const tipoProdutoId = resolveTipoProdutoId(contrato, tiposProduto);
  if (!tipoProdutoId) throw new Error('TIPO_PRODUTO_NAO_ENCONTRADO');

  let query = client
    .from('produtos')
    .select('id, nome, tipo_produto, cidade_id, todas_as_cidades')
    .ilike('nome', nomeBusca || nome);
  if (cidadeId) {
    query = query.eq('cidade_id', cidadeId);
  } else {
    query = query.eq('todas_as_cidades', true);
  }

  const { data: existentes, error: existentesError } = await query.limit(1);
  if (existentesError) throw existentesError;
  if (Array.isArray(existentes) && existentes[0]?.id) return existentes[0] as ProdutoLookup;

  const payload = {
    nome: String(nome).slice(0, 200),
    destino: titleCaseNome(String(destinoNome || contrato.destino || nome).trim()).slice(0, 200),
    cidade_id: cidadeId || null,
    tipo_produto: tipoProdutoId,
    todas_as_cidades: !cidadeId,
    ativo: true
  };

  const { data: criado, error: criarError } = await client
    .from('produtos')
    .insert(payload)
    .select('id, nome, tipo_produto, cidade_id, todas_as_cidades')
    .single();
  if (criarError) throw criarError;
  return criado as ProdutoLookup;
}

function guessPagaComissaoDefault(forma: string, termosNaoComissionaveis?: string[]) {
  const normalized = normalizeText(forma || '');
  const isCartaoCredito = normalized.includes('cartao') && normalized.includes('credito');
  if (isFormaNaoComissionavel(forma, termosNaoComissionaveis)) return false;
  if (isCartaoCredito) return true;
  if (normalized.includes('credito')) return false;
  if (normalized.includes('credipax')) return false;
  if (normalized.includes('credito pax')) return false;
  if (normalized.includes('vale viagem')) return false;
  if (normalized.includes('credito de viagem')) return false;
  return true;
}

function sanitizeDestinoTerm(destino?: string | null) {
  if (!destino) return '';
  let term = destino.replace(/\s+/g, ' ').trim();
  if (!term) return '';
  term = term.replace(/\s*[-–—]\s*\d+\s*dia\(s\).*$/i, '');
  term = term.replace(/\s*[-–—]\s*\d+\s*noite\(s\).*$/i, '');
  term = term.replace(/\s*\/\s*\d+\s*dia\(s\).*$/i, '');
  term = term.replace(/\s*\/\s*\d+\s*noite\(s\).*$/i, '');
  return term.trim();
}

function isLocacaoCarroTerm(value?: string | null) {
  const term = normalizeText(value || '');
  if (!term) return false;
  if (term.includes('locacao') || term.includes('locadora')) return true;
  if (term.includes('rent a car') || term.includes('rental car')) return true;
  return term.includes('carro') && term.includes('alug');
}

function isContratoLocacao(contrato: ContratoDraft) {
  return (
    isLocacaoCarroTerm(contrato.produto_principal) ||
    isLocacaoCarroTerm(contrato.produto_tipo) ||
    isLocacaoCarroTerm(contrato.produto_detalhes)
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findWordBoundaryMatch(rows: { id: string; nome: string | null }[], termo: string) {
  if (!rows.length) return null;
  const normalizedTerm = normalizeText(termo, { trim: true, collapseWhitespace: true });
  if (!normalizedTerm) return null;
  const regex = new RegExp(`\\b${escapeRegExp(normalizedTerm)}\\b`, 'i');
  const exact = rows.find((row) => {
    const nome = normalizeText(row.nome || '', { trim: true, collapseWhitespace: true });
    return regex.test(nome);
  });
  return exact?.id || null;
}

async function findCidadeIdByTerm(client: SupabaseClient, termo: string) {
  const safeTerm = sanitizePostgrestSearchTerm(termo, 120);
  if (safeTerm.length < 2) return null;

  const direct = await client.from('cidades').select('id, nome').ilike('nome', safeTerm).maybeSingle();
  if (direct.data?.id) return direct.data.id;

  const prefix = await client.from('cidades').select('id, nome').ilike('nome', `${safeTerm}%`).limit(5);
  if (prefix.data?.[0]?.id) return prefix.data[0].id;

  const contains = await client.from('cidades').select('id, nome').ilike('nome', `%${safeTerm}%`).limit(10);
  return findWordBoundaryMatch((contains.data || []) as CidadeLookupRow[], safeTerm);
}

async function findCidadeIdByDestinoTerm(client: SupabaseClient, termo: string) {
  const safeTerm = sanitizePostgrestSearchTerm(termo, 120);
  if (safeTerm.length < 2) return null;

  // Busca em produtos (tabela real) pelo nome do destino
  const direct = await client.from('produtos').select('cidade_id, nome').ilike('nome', safeTerm).maybeSingle();
  if (direct.data?.cidade_id) return direct.data.cidade_id;

  const prefix = await client.from('produtos').select('cidade_id, nome').ilike('nome', `${safeTerm}%`).limit(5);
  if (prefix.data?.[0]?.cidade_id) return prefix.data[0].cidade_id;

  const contains = await client.from('produtos').select('cidade_id, nome').ilike('nome', `%${safeTerm}%`).limit(10);
  const matchId = findWordBoundaryMatch(
    ((contains.data || []) as ProdutoCidadeLookupRow[]).map((row) => ({ id: row.cidade_id || '', nome: row.nome })),
    safeTerm
  );
  return matchId || null;
}

async function findClienteByDocumento(client: SupabaseClient, documento: string) {
  const documentoDigits = normalizeCpf(documento);
  const candidatos =
    documentoDigits.length === 11
      ? [
          documentoDigits,
          `${documentoDigits.slice(0, 3)}.${documentoDigits.slice(3, 6)}.${documentoDigits.slice(6, 9)}-${documentoDigits.slice(9, 11)}`,
        ]
      : documentoDigits.length === 14
        ? [
            documentoDigits,
            `${documentoDigits.slice(0, 2)}.${documentoDigits.slice(2, 5)}.${documentoDigits.slice(5, 8)}/${documentoDigits.slice(8, 12)}-${documentoDigits.slice(12, 14)}`,
          ]
        : [documentoDigits];
  const selectCols = 'id, cpf, nome, nascimento, endereco, numero, cidade, estado, cep, rg, telefone, whatsapp, email';

  const { data } = await client.from('clientes').select(selectCols).in('cpf', candidatos).limit(10);
  return Array.isArray(data) && data.length > 0 ? (data[0] as ClienteLookupRow) : null;
}

async function resolveClienteImport(client: SupabaseClient, companyId: string, userId: string, params: {
  cpf: string;
  nome?: string | null;
  nascimento?: string | null;
  endereco?: string | null;
  numero?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  rg?: string | null;
}) {
  const cpf = normalizeCpf(params.cpf);
  const nome = cleanImportedClienteNome(params.nome, '');
  const nascimento = isISODate(params.nascimento) ? params.nascimento : null;

  const existing = await findClienteByDocumento(client, cpf);
  if (existing) {
    const updates: ClienteUpdatePayload = {};
    const existingNome = String(existing.nome || '').trim();
    const existingNomeLimpo = cleanImportedClienteNome(existingNome, '');
    if (existingNomeLimpo && existingNomeLimpo !== existingNome) {
      updates.nome = existingNomeLimpo;
    } else if (nome && (!existingNome || normalizeText(existingNome) === 'cliente sem nome')) {
      updates.nome = nome;
    }
    if (params.endereco && !existing.endereco) updates.endereco = params.endereco;
    if (params.numero && !existing.numero) updates.numero = params.numero;
    if (params.cidade && !existing.cidade) updates.cidade = params.cidade;
    if (params.estado && !existing.estado) updates.estado = params.estado;
    if (params.cep && !existing.cep) updates.cep = params.cep;
    if (params.rg && !existing.rg) updates.rg = params.rg;
    if (Object.keys(updates).length > 0) {
      await client.from('clientes').update(updates).eq('id', existing.id);
    }
    return existing;
  }

  const { data: created, error: insertError } = await client
    .from('clientes')
    .insert({
      cpf: formatCpf(cpf),
      nome: (nome || 'Cliente sem nome').slice(0, 200),
      nascimento,
      endereco: params.endereco ? String(params.endereco).slice(0, 200) : null,
      numero: params.numero ? String(params.numero).slice(0, 20) : null,
      cidade: params.cidade ? String(params.cidade).slice(0, 100) : null,
      estado: params.estado ? String(params.estado).slice(0, 100) : null,
      cep: params.cep ? String(params.cep).slice(0, 20) : null,
      rg: params.rg ? String(params.rg).slice(0, 50) : null,
      company_id: companyId,
      created_by: userId,
      ativo: true
    })
    .select('id, cpf, nome, nascimento, endereco, numero, cidade, estado, cep, rg, telefone, whatsapp, email')
    .single();

    if (insertError) throw insertError;
  return created as ClienteLookupRow;
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_VENDA_IMPORTAR_CONTRATO_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(
      scope,
      ['vendas_importar', 'Importar Contratos', 'vendas_cadastro', 'vendas'],
      2,
      'Sem permissão para importar vendas.'
    );

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, unknown>)
        : {};
    const contratos: ContratoDraft[] = Array.isArray(body.contratos) ? (body.contratos as ContratoDraft[]) : [];
    const principalIndex = Number(body.principalIndex || 0);
    const dataVenda = String(body.dataVenda || '').trim();
    const vendedorId = String(body.vendedorId || '').trim() || user.id;
    const destinoCidadeId = String(body.destinoCidadeId || '').trim() || null;
    const destinoProdutoId = String(body.destinoProdutoId || '').trim() || null;
    const tipoImportacao = String(body.tipoImportacao || '').trim();
    const isFacialRextur = tipoImportacao === 'facial_rextur';
    const clienteTelefone = sanitizeOptionalContact(body.clienteTelefone as string | null | undefined);
    const clienteWhatsapp = sanitizeOptionalContact(body.clienteWhatsapp as string | null | undefined);
    const clienteEmail = sanitizeOptionalContact(body.clienteEmail as string | null | undefined);

    if (!contratos.length) {
      return textNoStore('Nenhum contrato para salvar.', 400);
    }
    if (!isISODate(dataVenda)) {
      return textNoStore('Data da venda inválida.', 400);
    }
    const hoje = todayISODateLocal();
    const dataLancamento = dataVenda > hoje ? hoje : dataVenda;

    const requestedCompanyId = String(body.company_id || body.empresa_id || '').trim();
    const companyId = scope.isAdmin
      ? requestedCompanyId || scope.companyId
      : resolveScopedCompanyId(scope, requestedCompanyId || scope.companyId);
    if (!companyId) {
      return textNoStore('Selecione a empresa para salvar venda.', 400);
    }

    if (!isUuid(vendedorId)) {
      return textNoStore('Vendedor inválido.', 400);
    }

    const deniedSeller = await ensureAssignableActiveSeller(client, scope, vendedorId);
    if (deniedSeller) {
      return textNoStore(deniedSeller, 403);
    }

    const { data: vendedorScope, error: vendedorScopeError } = await client
      .from('users')
      .select('id, company_id')
      .eq('id', vendedorId)
      .maybeSingle();
    if (vendedorScopeError) throw vendedorScopeError;
    const vendedorCompanyId = String((vendedorScope as SellerScopeRow | null)?.company_id || '').trim() || null;
    if (vendedorCompanyId && vendedorCompanyId !== companyId) {
      return textNoStore('Vendedor fora da empresa selecionada.', 403);
    }

    if (vendedorId !== user.id && !scope.isAdmin && !scope.isMaster) {
      if (scope.isGestor || scope.isFinanceiro) {
        const { data: targetSeller, error: targetSellerError } = await client
          .from('users')
          .select('id, company_id, active, uso_individual, user_types(name)')
          .eq('id', vendedorId)
          .maybeSingle();
        if (targetSellerError) throw targetSellerError;

        if (!targetSeller?.id) {
          return textNoStore('Vendedor informado nao encontrado.', 404);
        }

        const typedTargetSeller = targetSeller as TargetSellerRow | null;
        const targetCompanyId = String(typedTargetSeller?.company_id || '').trim() || null;
        if (!targetCompanyId || targetCompanyId !== companyId) {
          return textNoStore('Vendedor fora da empresa selecionada.', 403);
        }

        if (!Boolean(typedTargetSeller?.active) || Boolean(typedTargetSeller?.uso_individual)) {
          return textNoStore('Vendedor informado nao pode receber venda.', 403);
        }

        if (!isAllowedSellerTipo(readUserTypeName(typedTargetSeller?.user_types || null))) {
          return textNoStore('Usuario informado nao pode receber venda.', 403);
        }
      } else {
        return textNoStore('Sem permissão para atribuir venda a outro vendedor.', 403);
      }
    }

    const principal = contratos[principalIndex] || contratos[0];
    const cpfPrincipal = normalizeCpf(principal.contratante?.cpf);
    if (!cpfPrincipal || cpfPrincipal.length < 11) {
      return textNoStore('CPF/CNPJ do contratante principal é obrigatório.', 400);
    }

    const documentos = new Set<string>();
    for (const contrato of contratos) {
      documentos.add(normalizeCpf(contrato.contratante?.cpf));
    }
    if (documentos.size > 1) {
      return textNoStore('Importação contém contratos de documentos diferentes. Importe separadamente.', 400);
    }

    let cidadeId = destinoCidadeId;
    if (!cidadeId && principal.destino) {
      const term = sanitizeDestinoTerm(principal.destino);
      if (term) {
        cidadeId = await findCidadeIdByDestinoTerm(client, term);
        if (!cidadeId) {
          cidadeId = await findCidadeIdByTerm(client, term);
        }
      }
    }

    if (isContratoLocacao(principal)) {
      const { data: indefinida } = await client.from('cidades').select('id').ilike('nome', 'Indefinida').maybeSingle();
      if (!indefinida?.id) {
        return textNoStore("Cidade 'Indefinida' não encontrada. Cadastre antes de importar locação.", 400);
      }
      cidadeId = indefinida.id;
    }

    if (!cidadeId) {
      return textNoStore('Selecione a cidade de destino para continuar.', 400);
    }

    const clientePrincipal = await resolveClienteImport(client, companyId, user.id, {
      cpf: principal.contratante?.cpf || '',
      nome: principal.contratante?.nome,
      nascimento: principal.contratante?.nascimento,
      endereco: principal.contratante?.endereco,
      numero: principal.contratante?.numero,
      cidade: principal.contratante?.cidade,
      estado: principal.contratante?.uf,
      cep: principal.contratante?.cep,
      rg: principal.contratante?.rg
    });

    const contatos: ClienteContatoUpdatePayload = {};
    if (clienteTelefone) contatos.telefone = clienteTelefone;
    if (clienteWhatsapp) contatos.whatsapp = clienteWhatsapp;
    if (clienteEmail) contatos.email = clienteEmail;
    if (Object.keys(contatos).length > 0) {
      await client.from('clientes').update(contatos).eq('id', clientePrincipal.id);
    }

    if (!isFacialRextur) {
      try {
        await ensureReciboReservaUnicos({
          client,
          companyId,
          clienteId: clientePrincipal.id,
          recibos: contratos.map((contrato) => resolveContratoReciboNumeros(contrato, isFacialRextur))
        });
      } catch (err) {
        const code = toUserMessage(err, 'Erro ao validar duplicidade.');
        if (code === 'RECIBO_DUPLICADO' || code === 'RESERVA_DUPLICADA') {
          return textNoStore(code, 409);
        }
        throw err;
      }
    }

    const termosNaoComissionaveis = await carregarTermosNaoComissionaveis(client);

    const datasInicio: string[] = [];
    const datasFim: string[] = [];
    for (const contrato of contratos) {
      if (contrato.data_saida) datasInicio.push(contrato.data_saida);
      if (contrato.data_retorno) datasFim.push(contrato.data_retorno);
    }
    const dataInicioVenda = datasInicio.length ? datasInicio.sort()[0] : principal.data_saida || null;
    const dataFimVenda = datasFim.length ? datasFim.sort().slice(-1)[0] : principal.data_retorno || null;

    const totalBruto = contratos.reduce((sum, c) => sum + parseMoney(c.total_bruto), 0);
    const totalPago = contratos.reduce((sum, c) => sum + parseMoney(c.total_pago), 0);
    const totalTaxas = contratos.reduce((sum, c) => sum + parseMoney(c.taxas_embarque), 0);
    const totalRecibos = contratos.reduce((sum, c) => sum + getContratoValorTotalRecibo(c, tipoImportacao), 0);
    const descontoComercial = contratos.reduce((sum, c) => sum + parseMoney((c as ContratoImportRow).desconto_comercial), 0);
    const pagamentosDedup = dedupePagamentos(contratos.flatMap((c) => c.pagamentos || []));
    const totalPagoFallback = pagamentosDedup.length ? calcularTotalPagamentos(pagamentosDedup) : 0;
    const totalPagoFinal = totalPago > 0 ? totalPago : totalPagoFallback;

    const cidadeIds = Array.from(
      new Set(
        contratos
          .map((contrato) => String((contrato as ContratoImportRow).destino_cidade_id || '').trim() || cidadeId || '')
          .filter(Boolean)
      )
    );
    const cidadeNomeMap = new Map<string, string>();
    if (cidadeIds.length > 0) {
      for (const batch of chunkArray(cidadeIds)) {
        const { data: cidadesData, error: cidadesError } = await client
          .from('cidades')
          .select('id, nome')
          .in('id', batch);
        if (cidadesError) throw cidadesError;
        for (const cidade of cidadesData || []) {
          cidadeNomeMap.set(String(cidade.id), String(cidade.nome || '').trim());
        }
      }
    }

    const { data: tiposProdutoData, error: tiposProdutoError } = await client
      .from('tipo_produtos')
      .select('id, nome, tipo')
      .order('nome', { ascending: true });
    if (tiposProdutoError) throw tiposProdutoError;
    const tiposProduto = tiposProdutoData || [];

    const produtosMap = new Map<string, ProdutoLookup>();
    for (const contrato of contratos as ContratoImportRow[]) {
      const reciboCidadeId = String(contrato.destino_cidade_id || '').trim() || cidadeId || null;
      const produto = await resolveProdutoOperacional({
        client,
        contrato,
        produtoId: String(contrato.produto_resolvido_id || '').trim() || null,
        cidadeId: reciboCidadeId,
        destinoNome: cidadeNomeMap.get(String(reciboCidadeId || '')) || contrato.destino || null,
        tiposProduto
      });
      contrato.produto_resolvido_id = produto.id;
      produtosMap.set(String(produto.id), produto);
    }

    const produtoIds = Array.from(produtosMap.keys());

    const produtoVendaId =
      String((contratos[0] as ContratoImportRow | undefined)?.produto_resolvido_id || '').trim() ||
      destinoProdutoId ||
      produtoIds[0] ||
      null;

    if (!produtoVendaId || !produtosMap.has(produtoVendaId)) {
      return textNoStore('Produto de referência da venda inválido.', 400);
    }

    const { data: venda, error: vendaError } = await client
      .from('vendas')
      .insert({
        vendedor_id: vendedorId,
        cliente_id: clientePrincipal.id,
        destino_id: produtoVendaId,
        destino_cidade_id: cidadeId,
        company_id: companyId,
        data_lancamento: dataLancamento,
        data_venda: dataVenda,
        data_embarque: dataInicioVenda,
        data_final: dataFimVenda,
        desconto_comercial_aplicado: descontoComercial > 0,
        desconto_comercial_valor: descontoComercial || null,
        valor_total_bruto: totalBruto || null,
        valor_total_pago: totalPagoFinal || null,
        valor_taxas: totalTaxas || null,
        status: deriveVendaStatus(dataInicioVenda, dataFimVenda),
        cancelada: false
      })
      .select('id')
      .single();

    if (vendaError || !venda) throw vendaError || new Error('Erro ao criar venda.');

    const allPagamentos: PagamentoDraft[] = [];

    for (const contrato of contratos) {
      const contratoImport = contrato as ContratoImportRow;
      const produtoReciboId = String(contratoImport.produto_resolvido_id || '').trim() || destinoProdutoId || '';
      const produtoRecibo = produtosMap.get(produtoReciboId);
      if (!produtoRecibo?.id) {
        return textNoStore('Produto do recibo inválido.', 400);
      }

      const reciboCidadeId = String(contratoImport.destino_cidade_id || '').trim() || cidadeId || null;
      const tipoProdutoId = String(produtoRecibo.tipo_produto || '').trim() || null;
      const reciboNumeros = resolveContratoReciboNumeros(contrato, isFacialRextur);

      const { data: recibo, error: reciboError } = await client
        .from('vendas_recibos')
        .insert({
          venda_id: venda.id,
          produto_id: tipoProdutoId,
          produto_resolvido_id: produtoRecibo.id,
          destino_cidade_id: reciboCidadeId,
          numero_recibo: reciboNumeros.numero_recibo,
          numero_reserva: reciboNumeros.numero_reserva,
          tipo_pacote: contrato.tipo_pacote || null,
          valor_total: getContratoValorTotalRecibo(contrato, tipoImportacao),
          valor_taxas: parseMoney(contrato.taxas_embarque),
          valor_du: getContratoValorDu(contrato, isFacialRextur),
          valor_rav: getContratoValorRavRac(contrato, isFacialRextur),
          data_venda: dataVenda,
          data_inicio: contrato.data_saida || null,
          data_fim: contrato.data_retorno || null,
          contrato_path: null,
          contrato_url: null
        })
        .select('id')
        .single();

      if (reciboError || !recibo) throw reciboError || new Error('Erro ao criar recibo.');

      if (contrato.pagamentos?.length) {
        allPagamentos.push(...contrato.pagamentos);
      }

      const statusViagem = calcularStatusPeriodo(contrato.data_saida || null, contrato.data_retorno || null);

      const { data: viagem, error: viagemError } = await client
        .from('viagens')
        .insert({
          venda_id: venda.id,
          recibo_id: recibo.id,
          cliente_id: clientePrincipal.id,
          responsavel_user_id: vendedorId,
          company_id: companyId,
          origem: null,
          destino: (cidadeNomeMap.get(String(reciboCidadeId || '')) || sanitizeDestinoTerm(contrato.destino || principal.destino || '') || '').slice(0, 200) || null,
          data_inicio: contrato.data_saida || null,
          data_fim: contrato.data_retorno || null,
          status: statusViagem,
          observacoes: null
        })
        .select('id')
        .single();

      if (viagemError || !viagem) throw viagemError || new Error('Erro ao criar viagem.');

      const passageiros = (contrato.passageiros || []).filter(
        (p) => sanitizeImportedClienteNome(p.nome) && normalizeCpf(p.cpf).length >= 11
      );

      for (const p of passageiros) {
        const cpf = normalizeCpf(p.cpf);
        const passageiroNome = cleanImportedClienteNome(p.nome, 'Passageiro');
        const passageiroNascimento = isISODate(p.nascimento) ? p.nascimento : null;

        // Ignora se for o próprio cliente principal (mesmo CPF)
        const isMesmoCpfPrincipal = cpf === normalizeCpf(principal.contratante?.cpf);

        let passageiroCliente = await findClienteByDocumento(client, cpf);
        if (!passageiroCliente) {
          const { data: created } = await client
            .from('clientes')
            .insert({
              cpf: formatCpf(cpf),
              nome: String(passageiroNome).slice(0, 200),
              nascimento: passageiroNascimento,
              company_id: companyId,
              created_by: user.id,
              ativo: true
            })
            .select('id, cpf, nome, nascimento, endereco, numero, cidade, estado, cep, rg, telefone, whatsapp, email')
            .single();
          passageiroCliente = created as ClienteLookupRow;
        } else {
          const existingNome = String(passageiroCliente.nome || '').trim();
          const existingNomeLimpo = cleanImportedClienteNome(existingNome, '');
          const updates: Record<string, string> = {};
          if (existingNomeLimpo && existingNomeLimpo !== existingNome) {
            updates.nome = existingNomeLimpo;
          } else if (passageiroNome && (!existingNome || normalizeText(existingNome) === 'passageiro')) {
            updates.nome = passageiroNome;
          }
          if (Object.keys(updates).length > 0) {
            await client.from('clientes').update(updates).eq('id', passageiroCliente.id);
          }
        }

        if (passageiroCliente) {
          // Vincula à viagem como passageiro
          await client.from('viagem_passageiros').insert({
            viagem_id: viagem.id,
            cliente_id: passageiroCliente.id,
            company_id: companyId,
            papel: 'passageiro',
            created_by: user.id
          });

          // Vincula como acompanhante do cliente principal (se não for o próprio)
          if (!isMesmoCpfPrincipal) {
            const cpfNorm = cpf.replace(/\D/g, '');
            const { data: acompExistente } = await client
              .from('cliente_acompanhantes')
              .select('id')
              .eq('cliente_id', clientePrincipal.id)
              .eq('cpf', cpfNorm)
              .maybeSingle();

            if (!acompExistente?.id) {
              await client.from('cliente_acompanhantes').insert({
                cliente_id: clientePrincipal.id,
                company_id: companyId,
                nome_completo: String(passageiroNome).slice(0, 200),
                cpf: cpfNorm || null,
                data_nascimento: passageiroNascimento,
                ativo: true,
                created_by: user.id
              });
            }
          }
        }
      }
    }

    const dedupedPagamentos = dedupePagamentos(allPagamentos);
    let totalCreditosNaoComissionados = 0;
    for (const pagamento of dedupedPagamentos) {
      let formaId: string | null = null;
      let pagaComissao: boolean | null = null;
      const formaNome = String(pagamento.forma || '').trim();
      if (formaNome) {
        const formaNomeBusca = sanitizePostgrestSearchTerm(formaNome, 120);
        const { data: existingForma } = await client
          .from('formas_pagamento')
          .select('id, paga_comissao, permite_desconto')
          .ilike('nome', formaNomeBusca || formaNome.slice(0, 120))
          .maybeSingle();
        if (existingForma?.id) {
          formaId = existingForma.id;
          pagaComissao = existingForma.paga_comissao ?? true;
        } else {
          const { data: novaForma } = await client
            .from('formas_pagamento')
            .insert({
              nome: formaNome.slice(0, 200),
              ativo: true,
              company_id: companyId,
              paga_comissao: guessPagaComissaoDefault(formaNome, termosNaoComissionaveis),
              permite_desconto: Boolean(parseMoney(pagamento.desconto) > 0)
            })
            .select('id, paga_comissao')
            .single();
          if (novaForma?.id) {
            formaId = novaForma.id;
            pagaComissao = novaForma.paga_comissao ?? true;
          }
        }
      }

      const parcelasTotal = totalParcelasPagamento(pagamento);
      const valorBruto = parseMoney(pagamento.valor_bruto) || parcelasTotal;
      const descontoValor = parseMoney(pagamento.desconto) || inferPagamentoDesconto(valorBruto, parcelasTotal);
      const valorTotalPagamento =
        pagamento.total != null
          ? parseMoney(pagamento.total)
          : parcelasTotal > 0 && valorBruto > parcelasTotal
            ? parcelasTotal
          : valorBruto > 0
            ? Math.max(valorBruto - descontoValor, 0)
            : 0;
      const pagamentoComissionavel = isFormaNaoComissionavel(formaNome, termosNaoComissionaveis)
        ? false
        : pagaComissao ?? true;

      if (!pagamentoComissionavel) {
        totalCreditosNaoComissionados += valorBruto || valorTotalPagamento || 0;
      }

      await client.from('vendas_pagamentos').insert({
        venda_id: venda.id,
        company_id: companyId,
        forma_pagamento_id: formaId,
        forma_nome: formaNome ? formaNome.slice(0, 200) : null,
        operacao: pagamento.operacao || null,
        plano: pagamento.plano || null,
        valor_bruto: valorBruto || null,
        desconto_valor: descontoValor || null,
        valor_total: valorTotalPagamento || null,
        parcelas: Array.isArray(pagamento.parcelas) && pagamento.parcelas.length > 0 ? pagamento.parcelas : null,
        parcelas_qtd: pagamento.parcelas?.length || null,
        parcelas_valor: pagamento.parcelas?.length
          ? parseMoney(pagamento.parcelas[0].valor)
          : valorTotalPagamento || valorBruto || null,
        vencimento_primeira: pagamento.parcelas?.[0]?.vencimento || null,
        paga_comissao: pagamentoComissionavel
      });
    }

    const valorNaoComissionado = totalCreditosNaoComissionados || null;
    const valorTotalBase = totalRecibos > 0 ? totalRecibos : totalPagoFinal;
    const valorTotal = valorTotalBase > 0 ? Math.max(valorTotalBase - totalCreditosNaoComissionados, 0) : 0;
    await client
      .from('vendas')
      .update({ valor_nao_comissionado: valorNaoComissionado, valor_total: valorTotal || null })
      .eq('id', venda.id);

    invalidateSalesReadModels({
      companyIds: [companyId],
      vendedorIds: [vendedorId],
      userId: user.id
    });
    await markRankingReadModelDirty({ client, companyId, dataVenda });
    return json({ venda_id: venda.id }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar importação de contrato.');
  }
}
