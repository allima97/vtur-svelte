import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['viagens', 'operacao'], 2, 'Sem acesso a Viagens.');
    }

    const body = await event.request.json();
    const origem = String(body?.origem || '').trim();
    const destino = String(body?.destino || '').trim();
    const dataInicio = String(body?.data_inicio || '').trim();
    const dataFim = String(body?.data_fim || '').trim() || null;
    const status = String(body?.status || 'planejada').trim() || 'planejada';
    const clienteId = String(body?.cliente_id || '').trim();

    if (!origem || !destino || !dataInicio || !clienteId) {
      return json({ error: 'Dados obrigatorios ausentes.' }, { status: 400 });
    }

    const payload = {
      company_id: scope.companyId,
      responsavel_user_id: user.id,
      cliente_id: clienteId,
      origem,
      destino,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status,
      orcamento_id: null
    };

    const { error } = await client.from('viagens').insert(payload);
    if (error) throw error;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao criar viagem.');
  }
}
