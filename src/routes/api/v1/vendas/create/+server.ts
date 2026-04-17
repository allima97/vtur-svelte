import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import {
  buildVendaPayload,
  closeQuoteIfNeeded,
  ensureAssignableActiveSeller,
  ensureReciboReservaUnicos,
  syncVendaChildren
} from '$lib/server/vendasSave';

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vendas', 'vendas_cadastro'], 2, 'Sem permissao para cadastrar vendas.');
    }

    const body = await event.request.json();
    const venda = body?.venda || {};
    const recibos = Array.isArray(body?.recibos) ? body.recibos : [];
    const pagamentos = Array.isArray(body?.pagamentos) ? body.pagamentos : [];

    const vendedorId = String(venda?.vendedor_id || scope.userId).trim();
    const deniedSeller = await ensureAssignableActiveSeller(client, scope, vendedorId);
    if (!isUuid(vendedorId) || deniedSeller) {
      return json({ error: deniedSeller || 'Vendedor invalido.' }, { status: 400 });
    }

    const clienteId = String(venda?.cliente_id || '').trim();
    if (!isUuid(clienteId)) return json({ error: 'Cliente invalido.' }, { status: 400 });

    const destinoId = String(venda?.destino_id || '').trim();
    if (!isUuid(destinoId)) return json({ error: 'Destino invalido.' }, { status: 400 });

    if (!Array.isArray(recibos) || recibos.length === 0) {
      return json({ error: 'Inclua ao menos um recibo.' }, { status: 400 });
    }

    try {
      await ensureReciboReservaUnicos({
        client,
        companyId: scope.companyId,
        clienteId,
        recibos
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'Erro ao validar recibos.';
      if (code === 'RECIBO_DUPLICADO' || code === 'RESERVA_DUPLICADA') {
        return json({ code }, { status: 409 });
      }
      throw err;
    }

    let vendaPayload;
    try {
      vendaPayload = buildVendaPayload(venda, vendedorId, clienteId, destinoId, scope.companyId);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'DATA_VENDA_INVALIDA') {
        return json({ error: 'Data da venda invalida.' }, { status: 400 });
      }
      throw err;
    }
    const { data: insertedSale, error: saleError } = await client
      .from('vendas')
      .insert(vendaPayload)
      .select('id')
      .single();
    if (saleError || !insertedSale?.id) throw saleError || new Error('Erro ao criar venda.');

    await syncVendaChildren({
      client,
      vendaId: insertedSale.id,
      companyId: scope.companyId,
      clienteId,
      vendedorId,
      userId: user.id,
      recibos,
      pagamentos
    });

    await closeQuoteIfNeeded(client, body?.orcamento_id);

    return json({ ok: true, venda_id: insertedSale.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar venda.');
  }
}
