import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_viagens', 'viagens', 'operacao'], 1, 'Sem acesso a Viagens.');
    }

    const vendedorIds = scope.usoIndividual ? [user.id] : [];
    const accessibleClientIds = !scope.isAdmin
      ? await resolveAccessibleClientIds(client, { companyIds: scope.companyIds, vendedorIds })
      : [];

    let query = client.from('clientes').select('id, nome, cpf').order('nome', { ascending: true }).limit(200);
    if (!scope.isAdmin && accessibleClientIds.length > 0) {
      query = query.in('id', accessibleClientIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return json(data || []);
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar clientes.');
  }
}
