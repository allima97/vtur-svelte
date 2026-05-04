import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchRankingVendedoresByCompanyIds,
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

    if (!scope.isAdmin && !scope.isMaster && !scope.isFinanceiro && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 1, 'Sem acesso à Conciliação.');
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('company_id'));

    if (companyIds.length === 0) return json({ vendedores: [], produtosMeta: [] });

    const usersData = await fetchRankingVendedoresByCompanyIds(client, companyIds);

    const vendedoresFinal = ((usersData || []) as any[])
      .map((row) => ({
        id: String(row?.id || '').trim(),
        nome_completo: String(row?.nome_completo || '').trim() || 'Usuario'
      }))
      .filter((row) => Boolean(row.id))
      .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'));

    // Produtos com meta (tipo_produtos com soma_na_meta = true)
    const { data: produtosData } = await client
      .from('tipo_produtos')
      .select('id, nome')
      .eq('ativo', true)
      .eq('soma_na_meta', true)
      .order('nome')
      .limit(100);

    return json({
      vendedores: vendedoresFinal,
      produtosMeta: produtosData || []
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar opções da conciliação.');
  }
}
