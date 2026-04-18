import { normalizeText } from '$lib/normalizeText';
import { fetchGestorEquipeIdsComGestor, isUuid, type UserScope } from '$lib/server/v1';

function collapseSpaces(value?: string | null) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim().replace(/[^\d,.-]/g, '');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toNumber(value: unknown, fallback = 0) {
  const parsed = toNullableNumber(value);
  return parsed == null ? fallback : parsed;
}

export function toNullableString(value: unknown) {
  const parsed = String(value || '').trim();
  return parsed || null;
}

export function toISODateLocal(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function isISODate(value?: string | null) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

export function normalizeReceiptDisplay(value?: string | null): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/[A-Za-z]/.test(raw)) return raw;
  const digits = raw.replace(/\D+/g, '');
  if (digits.length === 14) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return raw;
}

export function normalizeReceiptKey(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalizeReservaKey(value?: string | null) {
  return normalizeText(collapseSpaces(value || '')).replace(/\s+/g, '');
}

function sanitizeLabel(value?: string | null) {
  return collapseSpaces(normalizeText(value || ''));
}

export function calcularStatusPeriodo(inicio?: string | null, fim?: string | null) {
  if (!inicio) return 'planejada';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataInicio = new Date(inicio);
  const dataFim = fim ? new Date(fim) : null;

  if (dataFim && dataFim < hoje) return 'concluida';
  if (dataInicio > hoje) return 'confirmada';
  if (dataFim && hoje > dataFim) return 'concluida';
  return 'em_viagem';
}

function isAllowedSellerTipo(tipoNome?: string | null) {
  const tipo = String(tipoNome || '').toUpperCase();
  return tipo.includes('VENDEDOR') || tipo.includes('GESTOR') || tipo.includes('MASTER');
}

export async function ensureAssignableActiveSeller(client: any, scope: UserScope, vendedorId: string) {
  const { data, error } = await client
    .from('users')
    .select('id, company_id, active, uso_individual, user_types(name)')
    .eq('id', vendedorId)
    .maybeSingle();
  if (error) throw error;

  const vendedor = data as any;
  if (!vendedor?.id) return 'Vendedor informado nao encontrado.';
  if (!Boolean(vendedor?.active)) return 'Vendedor informado esta inativo.';
  if (!isAllowedSellerTipo(vendedor?.user_types?.name)) return 'Usuario informado nao pode receber venda.';

  const vendedorCompanyId = String(vendedor?.company_id || '').trim() || null;

  if (scope.isAdmin) return null;
  if (scope.usoIndividual && vendedorId !== scope.userId) return 'Uso individual: vendedor invalido.';
  if (!scope.companyId || vendedorCompanyId !== scope.companyId) return 'Vendedor fora do escopo da empresa atual.';

  if (scope.isMaster) {
    if (Boolean(vendedor?.uso_individual)) return 'Master so pode atribuir vendas para usuarios corporativos ativos.';
    return null;
  }

  if (scope.isGestor) {
    if (Boolean(vendedor?.uso_individual)) return 'Gestor so pode atribuir vendas para equipe corporativa ativa.';
    const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
    if (!equipeIds.includes(vendedorId)) return 'Gestor so pode atribuir vendas para sua equipe ativa.';
    return null;
  }

  if (vendedorId !== scope.userId) return 'Sem permissao para atribuir venda para outro usuario.';
  return null;
}

export async function ensureReciboReservaUnicos(params: {
  client: any;
  companyId?: string | null;
  clienteId: string;
  ignoreVendaId?: string | null;
  recibos: any[];
}) {
  const { client, companyId, clienteId, ignoreVendaId, recibos } = params;
  const receiptKeys = Array.from(
    new Set(
      recibos
        .map((item) => normalizeReceiptKey(item?.numero_recibo))
        .filter(Boolean)
    )
  );
  const reservaKeys = Array.from(
    new Set(
      recibos
        .map((item) => normalizeReservaKey(item?.numero_reserva))
        .filter(Boolean)
    )
  );

  if (receiptKeys.length > 0) {
    let query = client
      .from('vendas_recibos')
      .select('id, numero_recibo, numero_recibo_normalizado, venda_id, vendas!inner(company_id)')
      .in('numero_recibo_normalizado', receiptKeys);
    if (companyId) query = query.eq('vendas.company_id', companyId);
    if (ignoreVendaId) query = query.neq('venda_id', ignoreVendaId);
    const { data, error } = await query.limit(1);
    if (error) throw error;
    if (Array.isArray(data) && data.length > 0) {
      throw new Error('RECIBO_DUPLICADO');
    }
  }

  if (reservaKeys.length > 0) {
    let query = client
      .from('vendas_recibos')
      .select('id, numero_recibo, numero_reserva, venda_id, vendas!inner(cliente_id, company_id)')
      .in(
        'numero_reserva',
        recibos.map((item) => toNullableString(item?.numero_reserva)).filter(Boolean)
      );
    if (companyId) query = query.eq('vendas.company_id', companyId);
    if (ignoreVendaId) query = query.neq('venda_id', ignoreVendaId);
    const { data, error } = await query;
    if (error) throw error;

    for (const recibo of recibos) {
      const reservaKey = normalizeReservaKey(recibo?.numero_reserva);
      if (!reservaKey) continue;
      const reciboKey = normalizeReceiptKey(recibo?.numero_recibo);
      const conflitos = (data || []).filter(
        (row: any) => normalizeReservaKey(row?.numero_reserva) === reservaKey
      );
      const bloqueia = conflitos.some(
        (row: any) =>
          String(row?.vendas?.cliente_id || '') === clienteId ||
          normalizeReceiptKey(row?.numero_recibo) === reciboKey
      );
      if (bloqueia) {
        throw new Error('RESERVA_DUPLICADA');
      }
    }
  }
}

export function buildVendaPayload(venda: any, vendedorId: string, clienteId: string, destinoId: string, companyId?: string | null) {
  const todayIso = toISODateLocal(new Date());
  const dataVendaInput = String(venda?.data_venda || '').trim();
  const dataLancamentoInput = String(venda?.data_lancamento || '').trim();
  if (!isISODate(dataVendaInput)) {
    throw new Error('DATA_VENDA_INVALIDA');
  }

  let dataLancamento = isISODate(dataLancamentoInput) ? dataLancamentoInput : todayIso;
  let dataVenda = dataVendaInput;
  if (dataLancamento > todayIso) dataLancamento = todayIso;
  if (dataVenda > todayIso) dataVenda = todayIso;
  if (dataVenda > dataLancamento) dataVenda = dataLancamento;

  const rawStatus = toNullableString(venda?.status);
  const normalizedStatus = rawStatus === 'aberto' ? 'pendente' : rawStatus;

  return {
    vendedor_id: vendedorId,
    cliente_id: clienteId,
    destino_id: destinoId,
    destino_cidade_id: toNullableString(venda?.destino_cidade_id),
    data_lancamento: dataLancamento,
    data_venda: dataVenda,
    data_embarque: toNullableString(venda?.data_embarque),
    data_final: toNullableString(venda?.data_final),
    desconto_comercial_aplicado: Boolean(venda?.desconto_comercial_aplicado),
    desconto_comercial_valor: toNullableNumber(venda?.desconto_comercial_valor),
    valor_total_bruto: toNullableNumber(venda?.valor_total_bruto),
    valor_total_pago: toNullableNumber(venda?.valor_total_pago),
    valor_total: toNullableNumber(venda?.valor_total),
    valor_taxas: toNullableNumber(venda?.valor_taxas),
    valor_nao_comissionado: toNullableNumber(venda?.valor_nao_comissionado),
    produto_id: toNullableString(venda?.produto_id),
    status: normalizedStatus || 'pendente',
    cancelada: Boolean(venda?.cancelada),
    notas: toNullableString(venda?.notas),
    ...(companyId ? { company_id: companyId } : {})
  };
}

export async function syncVendaChildren(params: {
  client: any;
  vendaId: string;
  companyId?: string | null;
  clienteId: string;
  vendedorId: string;
  userId: string;
  recibos: any[];
  pagamentos: any[];
}) {
  const { client, vendaId, companyId, clienteId, vendedorId, userId, recibos, pagamentos } = params;

  const recibosNormalizados = recibos.map((item) => ({
    ...item,
    numero_recibo: normalizeReceiptDisplay(item?.numero_recibo) || null,
    cidade_nome: sanitizeLabel(item?.cidade_nome) || null,
    produto_nome: sanitizeLabel(item?.produto_nome || item?.tipo_nome) || null
  }));

  const { error } = await client.rpc('sync_venda_children', {
    p_venda_id:    vendaId,
    p_company_id:  companyId ?? null,
    p_cliente_id:  clienteId,
    p_vendedor_id: vendedorId,
    p_user_id:     userId,
    p_recibos:     recibosNormalizados,
    p_pagamentos:  pagamentos ?? []
  });

  if (error) {
    if (error.message === 'RECIBO_INVALIDO') throw new Error('RECIBO_INVALIDO');
    throw error;
  }
}

export async function closeQuoteIfNeeded(client: any, orcamentoId?: string | null) {
  const id = String(orcamentoId || '').trim();
  if (!isUuid(id)) return;
  await client
    .from('quote')
    .update({
      status_negociacao: 'Fechado',
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
}
