import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  NO_MATCH_COMPANY_ID,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
  isUuid
} from '$lib/server/v1';
import {
  buildVendaPayload,
  syncVendaChildren,
  ensureAssignableActiveSeller,
  ensureReciboReservaUnicos,
  closeQuoteIfNeeded,
  toNullableString
} from '$lib/server/vendasSave';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { rejectCrossOriginRequest, rejectLargePayload } from '$lib/server/requestGuards';

// Espelha o contrato de vtur-app/src/pages/api/v1/vendas/cadastro-save.ts
// Aceita POST com payload { venda, recibos, pagamentos, orcamento_id? }
// Usa sync_venda_children RPC para inserir/atualizar recibos, viagens, passageiros e pagamentos de forma atômica.

const MAX_VENDA_CADASTRO_SAVE_BODY_BYTES = 512 * 1024;

export async function POST(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const payloadError = rejectLargePayload(event.request, MAX_VENDA_CADASTRO_SAVE_BODY_BYTES);
    if (payloadError) return payloadError;

    const adminClient = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(adminClient, user.id);

    const body = await event.request.json().catch(() => ({}));
    const { venda, recibos = [], pagamentos = [], orcamento_id } = body ?? {};

    // Validações mínimas
    if (!venda || typeof venda !== 'object') {
      return json({ error: 'Payload inválido: campo "venda" obrigatório.' }, { status: 400 });
    }
    if (!isUuid(venda.cliente_id)) {
      return json({ error: 'cliente_id inválido ou ausente.' }, { status: 400 });
    }
    if (!isUuid(venda.destino_id)) {
      return json({ error: 'destino_id inválido ou ausente.' }, { status: 400 });
    }
    if (!Array.isArray(recibos) || recibos.length === 0) {
      return json({ error: 'Pelo menos um recibo é obrigatório.' }, { status: 400 });
    }

    const clienteId = String(venda.cliente_id).trim();
    const vendaId = String(venda.id || '').trim();
    const isEdit = isUuid(vendaId);
    const requestedCompanyId = String(venda.company_id || venda.empresa_id || '').trim();
    const scopedCompanyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
    let targetCompanyId = scope.isAdmin
      ? requestedCompanyId || scope.companyId || null
      : scopedCompanyIds.length === 1
        ? scopedCompanyIds[0]
        : null;

    // Permissão: criação = nível 2; edição = nível 3
    if (!scope.isAdmin) {
      const moduloMin = isEdit ? 3 : 2;
      ensureModuloAccess(scope, ['vendas', 'vendas_cadastro'], moduloMin, 'Sem permissão para salvar vendas.');
    }

    if (!scope.isAdmin && (scopedCompanyIds.length === 0 || scopedCompanyIds[0] === NO_MATCH_COMPANY_ID)) {
      return json({ error: 'Empresa fora do escopo do usuario.' }, { status: 403 });
    }

    // Resolver vendedor_id
    const canAssign = scope.isGestor || scope.isMaster || scope.isFinanceiro || scope.isAdmin;
    const vendedorId =
      canAssign && isUuid(venda.vendedor_id) ? String(venda.vendedor_id) : scope.userId;

    // Validar vendedor
    if (!scope.isAdmin) {
      const denied = await ensureAssignableActiveSeller(adminClient, scope, vendedorId);
      if (denied) {
        return json({ error: denied }, { status: 403 });
      }
    }

    const { data: sellerScope, error: sellerScopeError } = await adminClient
      .from('users')
      .select('id, company_id')
      .eq('id', vendedorId)
      .maybeSingle();
    if (sellerScopeError) throw sellerScopeError;
    const sellerCompanyId = String((sellerScope as any)?.company_id || '').trim() || null;

    if (!targetCompanyId && sellerCompanyId && (scope.isAdmin || scopedCompanyIds.includes(sellerCompanyId))) {
      targetCompanyId = sellerCompanyId;
    }

    if (!targetCompanyId && scopedCompanyIds.length > 1) {
      return json({ error: 'Selecione a empresa da venda.' }, { status: 400 });
    }

    if (sellerCompanyId && targetCompanyId && sellerCompanyId !== targetCompanyId) {
      return json({ error: 'Vendedor fora da empresa selecionada.' }, { status: 403 });
    }

    if (isEdit) {
      let saleScopeQuery = adminClient
        .from('vendas')
        .select('id, company_id')
        .eq('id', vendaId);
      if (!scope.isAdmin && scopedCompanyIds.length > 0) {
        saleScopeQuery = saleScopeQuery.in('company_id', scopedCompanyIds);
      }
      const { data: existingSale, error: existingSaleError } = await saleScopeQuery.maybeSingle();
      if (existingSaleError) throw existingSaleError;
      if (!existingSale?.id) {
        return json({ error: 'Venda não encontrada ou sem permissão.' }, { status: 403 });
      }
      const existingCompanyId = String((existingSale as any)?.company_id || '').trim();
      if (isUuid(existingCompanyId)) targetCompanyId = existingCompanyId;
    }

    if (!isUuid(String(targetCompanyId || ''))) {
      return json({ error: 'Empresa da venda invalida.' }, { status: 400 });
    }

    // Verificar duplicidade de recibos/reservas
    await ensureReciboReservaUnicos({
      client: adminClient,
      companyId: targetCompanyId,
      clienteId,
      ignoreVendaId: isEdit ? vendaId : null,
      recibos
    });

    // Montar payload correto da venda (campos reais do banco)
    let vendaPayload: Record<string, unknown>;
    try {
      vendaPayload = buildVendaPayload(
        venda,
        vendedorId,
        clienteId,
        String(venda.destino_id),
        targetCompanyId
      );
    } catch (e: any) {
      if (e?.message === 'DATA_VENDA_INVALIDA') {
        return json({ error: 'data_venda inválida.' }, { status: 400 });
      }
      throw e;
    }

    let vendaIdFinal: string;

    if (isEdit) {
      // Edição: atualizar venda
      const { data: updated, error: updateError } = await adminClient
        .from('vendas')
        .update(vendaPayload)
        .eq('id', vendaId)
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated?.id) {
        return json({ error: 'Venda não encontrada ou sem permissão.' }, { status: 403 });
      }
      vendaIdFinal = updated.id;
    } else {
      // Criação: inserir venda
      const { data: inserted, error: insertError } = await adminClient
        .from('vendas')
        .insert(vendaPayload)
        .select('id')
        .single();
      if (insertError) throw insertError;
      vendaIdFinal = inserted.id;
    }

    if (!vendaIdFinal) {
      return json({ error: 'Venda não foi gerada.' }, { status: 500 });
    }

    // Sincronizar recibos, viagens, passageiros e pagamentos via RPC atômica
    await syncVendaChildren({
      client: adminClient,
      vendaId: vendaIdFinal,
      companyId: targetCompanyId,
      clienteId,
      vendedorId,
      userId: user.id,
      recibos,
      pagamentos
    });

    // Fechar orçamento vinculado, se houver
    await closeQuoteIfNeeded(adminClient, orcamento_id);

    return json({ ok: true, venda_id: vendaIdFinal }, { status: isEdit ? 200 : 201, headers: NO_STORE_HEADERS });
  } catch (err: any) {
    const code = err?.message;
    if (code === 'RECIBO_DUPLICADO' || code === 'RESERVA_DUPLICADA' || code === 'RECIBO_INVALIDO') {
      return json({ error: code }, { status: 409 });
    }
    return toErrorResponse(err, 'Erro ao salvar cadastro de venda.');
  }
}
