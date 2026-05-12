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
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { invalidateReadModelCache, READ_MODEL_TAGS, scopeCacheTags } from '$lib/server/readModelCache';

const MAX_PAGAMENTO_CONCILIAR_BODY_BYTES = 16 * 1024;

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

// Concilia um pagamento de venda com um recibo de conciliação
export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_PAGAMENTO_CONCILIAR_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['financeiro'], 3, 'Sem permissao para conciliar pagamento.');

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const pagamentoId = String(event.params.id || '').trim();
    if (!isUuid(pagamentoId)) {
      return json({ success: false, error: 'ID invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (body.venda_recibo_id && !isUuid(String(body.venda_recibo_id))) {
      return json({ success: false, error: 'ID do recibo invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { data: pagamentoAtual, error: pagamentoAtualError } = await client
      .from('vendas_pagamentos')
      .select('id, company_id')
      .eq('id', pagamentoId)
      .maybeSingle();
    if (pagamentoAtualError) throw pagamentoAtualError;
    if (!pagamentoAtual) {
      return json({ success: false, error: 'Pagamento nao encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    const targetCompanyId = String((pagamentoAtual as { company_id?: string | null })?.company_id || '').trim();
    if (!scope.isAdmin) {
      const companyIds = resolveScopedCompanyIds(scope, null);
      if (!targetCompanyId || companyIds.length === 0 || !companyIds.includes(targetCompanyId)) {
        return json({ success: false, error: 'Acesso negado.' }, { status: 403, headers: NO_STORE_HEADERS });
      }
    }

    // Atualiza o pagamento com o recibo de conciliação vinculado
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.venda_recibo_id) updateData.venda_recibo_id = body.venda_recibo_id;
    if (body.paga_comissao !== undefined) updateData.paga_comissao = body.paga_comissao;

    const { data: pagamento, error: pagError } = await client
      .from('vendas_pagamentos')
      .update(updateData)
      .eq('id', pagamentoId)
      .select('id, company_id, venda_id, forma_pagamento_id, forma_nome, operacao, plano, valor_bruto, desconto_valor, valor_total, parcelas_qtd, parcelas_valor, vencimento_primeira, paga_comissao, venda_recibo_id, observacoes, created_at, updated_at')
      .single();

    if (pagError) throw pagError;

    invalidatePagamentoReadModels(targetCompanyId, user.id);
    return json({ success: true, item: pagamento }, { headers: NO_STORE_HEADERS });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao conciliar pagamento.');
  }
}
