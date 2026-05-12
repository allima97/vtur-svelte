import { json, error } from '@sveltejs/kit';
import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';
import { fetchProdutoTarifas, sanitizeTarifasPayload } from '$lib/server/cadastros-base';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import { invalidateCatalogReadModels } from '$lib/server/readModelCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';

const MAX_PRODUTO_TARIFAS_BODY_BYTES = 256 * 1024;

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Produtos'], 1, 'Sem acesso a Produtos.');
    }

    const produtoId = String(event.url.searchParams.get('produto_id') || '').trim();
    if (!produtoId) throw error(400, 'produto_id é obrigatório.');

    const items = await fetchProdutoTarifas(client, produtoId);
    return json({ items }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar tarifas.');
  }
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_PRODUTO_TARIFAS_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Produtos'], 3, 'Sem permissão para editar produtos.');
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const produtoId = String(body?.produto_id || '').trim();
    if (!produtoId) throw error(400, 'produto_id é obrigatório.');

    const tarifas = sanitizeTarifasPayload(produtoId, body?.tarifas || []);

    const { error: deleteError } = await client.from('produtos_tarifas').delete().eq('produto_id', produtoId);
    if (deleteError) throw deleteError;

    if (tarifas.length > 0) {
      const { error: insertError } = await client.from('produtos_tarifas').insert(tarifas);
      if (insertError) throw insertError;
    }

    invalidateCatalogReadModels({ companyIds: scope.companyId ? [scope.companyId] : undefined, userId: user.id });
    return json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar tarifas.');
  }
}
