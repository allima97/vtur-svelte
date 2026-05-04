import { json } from '@sveltejs/kit';
import { getAdminClient, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';

const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function dedupeById<T extends { id?: string | null }>(rows: T[]) {
  const map = new Map<string, T>();
  rows.forEach((row) => {
    const id = String(row?.id || '').trim();
    if (id && !map.has(id)) map.set(id, row);
  });
  return Array.from(map.values());
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const fetchEmpresas = async () => {
      if (scope.companyIds.length === 0) return { data: [], error: null };
      if (scope.companyIds.length <= SUPABASE_IN_BATCH_SIZE) {
        return client
          .from('companies')
          .select('id, nome_fantasia, nome_empresa')
          .in('id', scope.companyIds)
          .order('nome_fantasia', { ascending: true });
      }

      const rows: any[] = [];
      for (const batch of chunkArray(scope.companyIds)) {
        const result = await client
          .from('companies')
          .select('id, nome_fantasia, nome_empresa')
          .in('id', batch)
          .order('nome_fantasia', { ascending: true });
        if (result.error) return result;
        rows.push(...(result.data || []));
      }

      return {
        data: dedupeById(rows).sort((left, right) =>
          String(left?.nome_fantasia || left?.nome_empresa || '').localeCompare(
            String(right?.nome_fantasia || right?.nome_empresa || ''),
            'pt-BR'
          )
        ),
        error: null
      };
    };

    const empresas = await fetchEmpresas();

    if (empresas.error) throw empresas.error;

    return json({
      success: true,
      user_id: user.id,
      company_id: scope.companyId,
      company_ids: scope.companyIds,
      empresas: (empresas.data || []).map((row: any) => ({
        id: String(row?.id || ''),
        nome: String(row?.nome_fantasia || row?.nome_empresa || 'Empresa sem nome')
      })),
      nome: scope.nome,
      email: scope.email,
      papel: scope.papel,
      isAdmin: scope.isAdmin,
      isMaster: scope.isMaster,
      isFinanceiro: scope.isFinanceiro,
      isGestor: scope.isGestor,
      isVendedor: scope.isVendedor
    });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao carregar contexto do usuário.');
  }
}
