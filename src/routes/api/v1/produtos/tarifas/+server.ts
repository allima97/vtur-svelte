import { json, error } from '@sveltejs/kit';
import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';
import { fetchProdutoTarifas, sanitizeTarifasPayload } from '$lib/server/cadastros-base';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['produtos', 'cadastros'], 1, 'Sem acesso a Produtos.');
    }

    const produtoId = String(event.url.searchParams.get('produto_id') || '').trim();
    if (!produtoId) throw error(400, 'produto_id é obrigatório.');

    const items = await fetchProdutoTarifas(client, produtoId);
    return json({ items });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar tarifas.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['produtos', 'cadastros'], 3, 'Sem permissão para editar produtos.');
    }

    const body = await event.request.json();
    const produtoId = String(body?.produto_id || '').trim();
    if (!produtoId) throw error(400, 'produto_id é obrigatório.');

    const tarifas = sanitizeTarifasPayload(produtoId, body?.tarifas || []);

    const { error: deleteError } = await client.from('produtos_tarifas').delete().eq('produto_id', produtoId);
    if (deleteError) throw deleteError;

    if (tarifas.length > 0) {
      const { error: insertError } = await client.from('produtos_tarifas').insert(tarifas);
      if (insertError) throw insertError;
    }

    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar tarifas.');
  }
}
