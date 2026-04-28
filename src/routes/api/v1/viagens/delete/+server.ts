import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_viagens', 'viagens', 'operacao'], 4, 'Sem acesso a Viagens.');
    }

    const body = await event.request.json();
    const id = String(body?.id || '').trim();
    const vendaId = String(body?.venda_id || '').trim();

    if (!id && !vendaId) {
      return json({ error: 'Parametros invalidos.' }, { status: 400 });
    }

    // Valida formato dos IDs
    if (id && !isUuid(id)) return json({ error: 'ID de viagem inválido.' }, { status: 400 });
    if (vendaId && !isUuid(vendaId)) return json({ error: 'ID de venda inválido.' }, { status: 400 });

    const companyIds = resolveScopedCompanyIds(scope, body?.company_id || body?.empresa_id);

    // ✅ Guard: admin sem company_id explícito não pode deletar sem escopo
    if (companyIds.length === 0) {
      return json({ error: 'Informe company_id para excluir viagem.' }, { status: 400 });
    }

    let query = client.from('viagens').delete().in('company_id', companyIds);
    if (scope.usoIndividual) query = query.eq('responsavel_user_id', user.id);

    const result = vendaId
      ? await query.eq('venda_id', vendaId)
      : await query.eq('id', id);

    if (result.error) throw result.error;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir viagem.');
  }
}
