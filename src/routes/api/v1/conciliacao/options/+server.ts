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

function normalizeTipoNome(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function resolveUserTypeName(userTypes: unknown) {
  if (Array.isArray(userTypes)) return String((userTypes[0] as any)?.name || '');
  return String((userTypes as any)?.name || '');
}

function isAllowedRankingTipo(value: unknown) {
  const tipoNome = normalizeTipoNome(value);
  return tipoNome.includes('VENDEDOR') || tipoNome.includes('GESTOR') || tipoNome.includes('MASTER');
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 1, 'Sem acesso à Conciliação.');
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('company_id'));
    const companyId = companyIds[0] || scope.companyId;

    if (!companyId) return json({ vendedores: [], produtosMeta: [] });

    let allowedIds: string[] = [];
    if (scope.isGestor && !scope.isAdmin) {
      const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);

      const { data: gestoresData } = await client
        .from('users')
        .select('id, user_types(name)')
        .eq('company_id', companyId)
        .eq('uso_individual', false)
        .eq('active', true);

      const gestoresIds = ((gestoresData || []) as any[])
        .filter((row) => isAllowedRankingTipo(resolveUserTypeName(row?.user_types)))
        .map((row) => String(row?.id || '').trim())
        .filter(Boolean);

      allowedIds = Array.from(new Set([...(equipeIds || []), ...gestoresIds]));
    }

    let usersQuery = client
      .from('users')
      .select('id, nome_completo, user_types(name)')
      .eq('company_id', companyId)
      .eq('active', true)
      .order('nome_completo')
      .limit(500);

    if (allowedIds.length > 0) {
      usersQuery = usersQuery.in('id', allowedIds);
    }

    const { data: usersData, error: usersErr } = await usersQuery;
    if (usersErr) throw usersErr;

    const vendedoresFiltrados = ((usersData || []) as any[])
      .filter((row) => isAllowedRankingTipo(resolveUserTypeName(row?.user_types)))
      .map((row) => ({
        id: String(row?.id || '').trim(),
        nome_completo: String(row?.nome_completo || '').trim() || 'Usuario'
      }))
      .filter((row) => Boolean(row.id));

    let vendedoresFinal = vendedoresFiltrados;
    if (scope.isGestor && vendedoresFinal.length === 0) {
      const { data: fallbackUsers } = await client
        .from('users')
        .select('id, nome_completo, user_types(name)')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('nome_completo')
        .limit(500);

      vendedoresFinal = ((fallbackUsers || []) as any[])
        .filter((row) => isAllowedRankingTipo(resolveUserTypeName(row?.user_types)))
        .map((row) => ({
          id: String(row?.id || '').trim(),
          nome_completo: String(row?.nome_completo || '').trim() || 'Usuario'
        }))
        .filter((row) => Boolean(row.id));
    }

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
