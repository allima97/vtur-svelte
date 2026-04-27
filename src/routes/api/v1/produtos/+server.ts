import { json } from '@sveltejs/kit';
import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';
import { fetchProdutosBase } from '$lib/server/cadastros-base';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Produtos'], 1, 'Sem acesso a Produtos.');
    }

    const payload = await fetchProdutosBase(client, scope, event.url.searchParams);
    return json({
      items: payload.produtos,
      total: payload.total,
      tipos: payload.tipos,
      cidades: payload.cidades,
      fornecedores: payload.fornecedores
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar produtos.');
  }
}
