import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { ensureClienteAccess } from '$lib/server/clientes';

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const clienteId = String(event.params.id || '').trim();
    const acompanhanteId = String(event.params.acompanhanteId || '').trim();

    await ensureClienteAccess(client, scope, clienteId, null, null, 2);

    const body = await event.request.json();
    const nomeCompleto = String(body?.nome_completo || '').trim();
    if (!nomeCompleto) {
      return json({ error: 'Informe o nome completo do acompanhante.' }, { status: 400 });
    }

    const { data, error } = await client
      .from('cliente_acompanhantes')
      .update({
        nome_completo: nomeCompleto,
        cpf: String(body?.cpf || '').replace(/\D/g, '') || null,
        telefone: String(body?.telefone || '').trim() || null,
        grau_parentesco: String(body?.grau_parentesco || '').trim() || null,
        rg: String(body?.rg || '').trim() || null,
        data_nascimento: String(body?.data_nascimento || '').trim() || null,
        observacoes: String(body?.observacoes || '').trim() || null,
        ativo: body?.ativo !== false,
        updated_at: new Date().toISOString()
      })
      .eq('id', acompanhanteId)
      .eq('cliente_id', clienteId)
      .select('id, cliente_id, company_id, nome_completo, cpf, telefone, grau_parentesco, rg, data_nascimento, observacoes, ativo, created_at, updated_at')
      .single();

    if (error) throw error;

    return json({
      item: data,
      message: 'Acompanhante atualizado com sucesso.'
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar acompanhante.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const clienteId = String(event.params.id || '').trim();
    const acompanhanteId = String(event.params.acompanhanteId || '').trim();

    await ensureClienteAccess(client, scope, clienteId, null, null, 3);

    const { error } = await client
      .from('cliente_acompanhantes')
      .delete()
      .eq('id', acompanhanteId)
      .eq('cliente_id', clienteId);

    if (error) throw error;

    return json({
      message: 'Acompanhante removido com sucesso.'
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao remover acompanhante.');
  }
}
