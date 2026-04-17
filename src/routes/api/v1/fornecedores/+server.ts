import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { fetchFornecedores } from '$lib/server/fornecedores';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['cadastros', 'fornecedores'], 1, 'Sem acesso a Fornecedores.');
    }

    const payload = await fetchFornecedores(client, scope, event.url.searchParams);
    return json(payload);
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar fornecedores.');
  }
}
