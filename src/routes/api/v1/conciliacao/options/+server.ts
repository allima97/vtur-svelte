import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchGestorEquipeIdsComGestor,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['conciliacao'], 1, 'Sem acesso à Conciliação.');
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('company_id'));
    const companyId = companyIds[0] || scope.companyId;

    if (!companyId) return json({ vendedores: [], produtosMeta: [] });

    // Vendedores da equipe
    let vendedorIds: string[] = [];
    if (scope.isGestor) {
      vendedorIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
    }

    let vendedoresQuery = client
      .from('users')
      .select('id, nome_completo')
      .eq('active', true)
      .eq('company_id', companyId)
      .order('nome_completo')
      .limit(100);

    if (vendedorIds.length > 0 && !scope.isAdmin && !scope.isMaster) {
      vendedoresQuery = vendedoresQuery.in('id', vendedorIds);
    }

    const { data: vendedoresData } = await vendedoresQuery;

    // Produtos com meta (tipo_produtos com soma_na_meta = true)
    const { data: produtosData } = await client
      .from('tipo_produtos')
      .select('id, nome')
      .eq('ativo', true)
      .eq('soma_na_meta', true)
      .order('nome')
      .limit(100);

    return json({
      vendedores: vendedoresData || [],
      produtosMeta: produtosData || []
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar opções da conciliação.');
  }
}
