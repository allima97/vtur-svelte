import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
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

// Espelha o contrato de vtur-app/src/pages/api/v1/vendas/cadastro-save.ts
// Aceita POST com payload { venda, recibos, pagamentos, orcamento_id? }
// Usa sync_venda_children RPC para inserir/atualizar recibos, viagens, passageiros e pagamentos de forma atômica.

export async function POST(event: RequestEvent) {
  try {
    const adminClient = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(adminClient, user.id);

    const body = await event.request.json();
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

    // Permissão: criação = nível 2; edição = nível 3
    if (!scope.isAdmin) {
      const moduloMin = isEdit ? 3 : 2;
      ensureModuloAccess(scope, ['vendas', 'vendas_cadastro'], moduloMin, 'Sem permissão para salvar vendas.');
    }

    // Resolver vendedor_id
    const canAssign = scope.isGestor || scope.isMaster || scope.isAdmin;
    const vendedorId =
      canAssign && isUuid(venda.vendedor_id) ? String(venda.vendedor_id) : scope.userId;

    // Validar vendedor
    if (!scope.isAdmin) {
      const denied = await ensureAssignableActiveSeller(adminClient, scope, vendedorId);
      if (denied) {
        return json({ error: denied }, { status: 403 });
      }
    }

    // Verificar duplicidade de recibos/reservas
    await ensureReciboReservaUnicos({
      client: adminClient,
      companyId: scope.companyId,
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
        scope.companyId
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
      companyId: scope.companyId,
      clienteId,
      vendedorId,
      userId: user.id,
      recibos,
      pagamentos
    });

    // Fechar orçamento vinculado, se houver
    await closeQuoteIfNeeded(adminClient, orcamento_id);

    return json({ ok: true, venda_id: vendaIdFinal }, { status: isEdit ? 200 : 201 });
  } catch (err: any) {
    const code = err?.message;
    if (code === 'RECIBO_DUPLICADO' || code === 'RESERVA_DUPLICADA' || code === 'RECIBO_INVALIDO') {
      return json({ error: code }, { status: 409 });
    }
    return toErrorResponse(err, 'Erro ao salvar cadastro de venda.');
  }
}
