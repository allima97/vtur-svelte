import { json } from '@sveltejs/kit';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import { invalidateReadModelCache, READ_MODEL_TAGS, scopeCacheTags } from '$lib/server/readModelCache';

const MAX_PAGAMENTO_UPDATE_BODY_BYTES = 64 * 1024;
const PAGAMENTO_ALLOWED_UPDATE_FIELDS = [
  'forma_nome', 'forma_pagamento_id', 'valor_total', 'valor_bruto',
  'desconto_valor', 'paga_comissao', 'observacoes',
  'parcelas_qtd', 'parcelas_valor', 'vencimento_primeira'
];

function invalidatePagamentoReadModels(companyId: string | null | undefined, userId: string) {
  invalidateReadModelCache({
    tags: [
      READ_MODEL_TAGS.payments,
      READ_MODEL_TAGS.sales,
      READ_MODEL_TAGS.finance,
      READ_MODEL_TAGS.dashboard,
      READ_MODEL_TAGS.vendasKpis,
      READ_MODEL_TAGS.ranking,
      READ_MODEL_TAGS.comissoes
    ],
    scopeTags: scopeCacheTags({ companyIds: companyId ? [companyId] : [], userId })
  });
}

async function resolvePagamentoComScope(
  client: any,
  id: string,
  scope: any
): Promise<{ pagamento: any; companyId: string | null } | null> {
  const { data, error } = await client
    .from('vendas_pagamentos')
    .select(
      'id, company_id, venda_id, forma_pagamento_id, forma_nome, operacao, plano, valor_bruto, desconto_valor, valor_total, parcelas_qtd, parcelas_valor, vencimento_primeira, paga_comissao, observacoes, created_at, updated_at, venda:vendas!venda_id(id, numero_venda, company_id), forma_pagamento:formas_pagamento!forma_pagamento_id(id, nome)'
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const companyId = String((data as any)?.venda?.company_id || data?.company_id || '').trim() || null;
  return { pagamento: data, companyId };
}

function canAccessPagamentoCompany(scope: any, companyId: string | null) {
  if (scope.isAdmin) return true;
  const companyIds = resolveScopedCompanyIds(scope, null);
  return Boolean(companyId && companyIds.length > 0 && companyIds.includes(companyId));
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro'], 1, 'Sem acesso ao Financeiro.');
    }

    const id = String(event.params.id || '').trim();
    if (!isUuid(id)) return json({ success: false, error: 'ID invalido.' }, { status: 400, headers: NO_STORE_HEADERS });

    const result = await resolvePagamentoComScope(client, id, scope);
    if (!result) return json({ success: false, error: 'Pagamento nao encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });

    if (!canAccessPagamentoCompany(scope, result.companyId)) {
      return json({ success: false, error: 'Acesso negado.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    return json({ success: true, item: result.pagamento }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao carregar pagamento.');
  }
}

export async function PATCH(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_PAGAMENTO_UPDATE_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['financeiro'], 3, 'Sem permissão para editar pagamento.');

    const id = String(event.params.id || '').trim();
    if (!isUuid(id)) return json({ success: false, error: 'ID invalido.' }, { status: 400, headers: NO_STORE_HEADERS });

    const result = await resolvePagamentoComScope(client, id, scope);
    if (!result) return json({ success: false, error: 'Pagamento nao encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });

    if (!canAccessPagamentoCompany(scope, result.companyId)) {
      return json({ success: false, error: 'Acesso negado.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of PAGAMENTO_ALLOWED_UPDATE_FIELDS) {
      if (key in body) updateData[key] = body[key];
    }

    const { data, error } = await client
      .from('vendas_pagamentos')
      .update(updateData)
      .eq('id', id)
      .select('id, company_id, venda_id, forma_pagamento_id, forma_nome, operacao, plano, valor_bruto, desconto_valor, valor_total, parcelas_qtd, parcelas_valor, vencimento_primeira, paga_comissao, observacoes, created_at, updated_at')
      .single();

    if (error) throw error;
    invalidatePagamentoReadModels(result.companyId, user.id);
    return json({ success: true, item: data }, { headers: NO_STORE_HEADERS });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao atualizar pagamento.');
  }
}

export async function DELETE(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['financeiro'], 4, 'Sem permissão para excluir pagamento.');

    const id = String(event.params.id || '').trim();
    if (!isUuid(id)) return json({ success: false, error: 'ID invalido.' }, { status: 400, headers: NO_STORE_HEADERS });

    const result = await resolvePagamentoComScope(client, id, scope);
    if (!result) return json({ success: false, error: 'Pagamento nao encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });

    if (!canAccessPagamentoCompany(scope, result.companyId)) {
      return json({ success: false, error: 'Acesso negado.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const { error } = await client
      .from('vendas_pagamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    invalidatePagamentoReadModels(result.companyId, user.id);
    return json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao excluir pagamento.');
  }
}
