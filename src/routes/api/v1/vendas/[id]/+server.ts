import { json, error } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import {
  buildVendaPayload,
  ensureAssignableActiveSeller,
  ensureReciboReservaUnicos,
  syncVendaChildren
} from '$lib/server/vendasSave';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 1, 'Sem acesso a Vendas.');

    const id = String(event.params.id || '').trim();
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('empresa_id'));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, event.url.searchParams.get('vendedor_id'));

    let query = client
      .from('vendas')
      .select(`*, cliente:clientes!vendas_cliente_id_fkey(id,nome,cpf,telefone,email,whatsapp), vendedor:users!vendas_vendedor_id_fkey(id,nome_completo), destino:produtos!vendas_destino_id_fkey(id,nome), destino_cidade:cidades!vendas_destino_cidade_id_fkey(id,nome), recibos:vendas_recibos(*, destino_cidade:cidades!destino_cidade_id(id,nome), produto_resolvido:produtos!produto_resolvido_id(id,nome), tipo_produtos:tipo_produtos!produto_id(id,nome,tipo)), pagamentos:vendas_pagamentos(*)`)
      .eq('id', id);
    if (companyIds.length > 0) query = query.in('company_id', companyIds);
    if (vendedorIds.length > 0) query = query.in('vendedor_id', vendedorIds);
    const { data, error: queryError } = await query.maybeSingle();
    if (queryError) throw queryError;
    if (!data) throw error(404, 'Venda não encontrada.');
    return json(data);
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar venda.');
  }
}

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 3, 'Sem permissão para editar vendas.');

    const id = String(event.params.id || '').trim();
    const body = await event.request.json();
    const venda = body?.venda || body || {};
    const recibos = Array.isArray(body?.recibos) ? body.recibos : [];
    const pagamentos = Array.isArray(body?.pagamentos) ? body.pagamentos : [];

    const vendedorId = String(venda?.vendedor_id || '').trim() || scope.userId;
    const deniedSeller = await ensureAssignableActiveSeller(client, scope, vendedorId);
    if (!isUuid(vendedorId) || deniedSeller) {
      return json({ error: deniedSeller || 'Vendedor invalido.' }, { status: 400 });
    }

    const clienteId = String(venda?.cliente_id || '').trim();
    if (!isUuid(clienteId)) {
      return json({ error: 'Cliente invalido.' }, { status: 400 });
    }

    const destinationId = String(venda?.destino_id || '').trim();
    if (!isUuid(destinationId)) {
      return json({ error: 'Destino invalido.' }, { status: 400 });
    }

    if (!Array.isArray(recibos) || recibos.length === 0) {
      return json({ error: 'Inclua ao menos um recibo.' }, { status: 400 });
    }

    try {
      await ensureReciboReservaUnicos({
        client,
        companyId: scope.companyId,
        clienteId,
        ignoreVendaId: id,
        recibos
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'Erro ao validar recibos.';
      if (code === 'RECIBO_DUPLICADO' || code === 'RESERVA_DUPLICADA') {
        return json({ code }, { status: 409 });
      }
      throw err;
    }

    let payload;
    try {
      payload = buildVendaPayload(venda, vendedorId, clienteId, destinationId, scope.companyId);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'DATA_VENDA_INVALIDA') {
        return json({ error: 'Data da venda invalida.' }, { status: 400 });
      }
      throw err;
    }

    let query = client.from('vendas').update(payload).eq('id', id);
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('empresa_id'));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, event.url.searchParams.get('vendedor_id'));
    if (companyIds.length > 0) query = query.in('company_id', companyIds);
    if (vendedorIds.length > 0) query = query.in('vendedor_id', vendedorIds);
    const { data, error: updateError } = await query.select('id').maybeSingle();
    if (updateError) throw updateError;
    if (!data?.id) throw error(404, 'Venda não encontrada.');

    await syncVendaChildren({
      client,
      vendaId: data.id,
      companyId: scope.companyId,
      clienteId,
      vendedorId,
      userId: user.id,
      recibos,
      pagamentos
    });

    return json({ ok: true, venda_id: data.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar venda.');
  }
}
