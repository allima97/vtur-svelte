import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchVendedorIdsByCompanyIds,
  getAdminClient,
  isRankingEligibleUser,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { SHORT_DYNAMIC_READ_HEADERS } from '$lib/server/httpCache';

const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['relatorios', 'dashboard', 'vendas'], 1, 'Sem acesso aos filtros analíticos.');
    }

    const { searchParams } = event.url;
    const requestedCompanyId = String(searchParams.get('empresa_id') || '').trim();
    const tipoNome = String(scope.tipoNome || '').toUpperCase();
    const isAdminByType = tipoNome.includes('ADMIN');
    const isGestorByType = tipoNome.includes('GESTOR');
    const isMasterByType = tipoNome.includes('MASTER');

    let scopedTeamIds: string[] = [];
    let companyIdsForUsers: string[] = [];
    let enforceCorporateOnly = false;

    if (isAdminByType) {
      companyIdsForUsers = requestedCompanyId ? [requestedCompanyId] : [];
    } else if (isGestorByType) {
      companyIdsForUsers = scope.companyId ? [scope.companyId] : resolveScopedCompanyIds(scope, requestedCompanyId);
      scopedTeamIds = await fetchVendedorIdsByCompanyIds(client, companyIdsForUsers);
    } else if (isMasterByType) {
      companyIdsForUsers = resolveScopedCompanyIds(scope, requestedCompanyId);
      enforceCorporateOnly = true;
    } else {
      companyIdsForUsers = resolveScopedCompanyIds(scope, requestedCompanyId);
      scopedTeamIds = [scope.userId];
    }

    const fetchCompanies = async () => {
      const rows: any[] = [];
      const companyBatches =
        !scope.isAdmin && scope.companyIds.length > 0 ? chunkArray(scope.companyIds) : [null];

      for (const companyBatch of companyBatches) {
        let query = client
          .from('companies')
          .select('id, nome_fantasia, nome_empresa, active')
          .order('nome_fantasia', { ascending: true })
          .limit(500);

        if (companyBatch) query = query.in('id', companyBatch);

        const { data, error } = await query;
        if (error) throw error;
        rows.push(...(data || []));
      }
      return rows;
    };

    const fetchUsers = async () => {
      const rows: any[] = [];
      const runQuery = async (filters?: { ids?: string[] | null; companyIds?: string[] | null }) => {
        let query = client
          .from('users')
          .select(`
            id,
            nome_completo,
            email,
            company_id,
            active,
            uso_individual,
            user_types (name),
            companies (nome_fantasia, nome_empresa)
          `)
          .limit(1000);

        if (filters?.ids && filters.ids.length > 0) query = query.in('id', filters.ids);
        if (filters?.companyIds && filters.companyIds.length > 0)
          query = query.in('company_id', filters.companyIds);

        if (enforceCorporateOnly) {
          query = query.eq('uso_individual', false).eq('active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        rows.push(...(data || []));
      };

      if (!scope.isAdmin && scopedTeamIds.length > 0) {
        for (const idBatch of chunkArray(scopedTeamIds)) {
          await runQuery({ ids: idBatch });
        }
      } else if (!scope.isAdmin && companyIdsForUsers.length > 0) {
        for (const companyBatch of chunkArray(companyIdsForUsers)) {
          await runQuery({ companyIds: companyBatch });
        }
      } else {
        await runQuery();
      }

      return rows;
    };

    const [companiesRows, usersRows] = await Promise.all([fetchCompanies(), fetchUsers()]);

    const empresas = companiesRows.map((row: any) => ({
      id: String(row.id || ''),
      nome: String(row.nome_fantasia || row.nome_empresa || 'Empresa sem nome'),
      active: row.active !== false
    }));

    const vendedores = usersRows
      .filter((row: any) => {
        if (row?.active === false) return false;
        if (row?.uso_individual === true && String(row?.id || '') !== user.id) return false;
        if (isGestorByType && scopedTeamIds.length > 0) return true;
        if (String(row?.id || '') === user.id && scope.isVendedor) return true;
        return isRankingEligibleUser(row);
      })
      .map((row: any) => {
        const userType = Array.isArray(row?.user_types) ? row.user_types[0] : row?.user_types;
        const company = Array.isArray(row?.companies) ? row.companies[0] : row?.companies;

        return {
        id: String(row.id || ''),
        nome: String(row.nome_completo || row.email || 'Usuário sem nome'),
        company_id: String(row.company_id || ''),
        company_name: String(company?.nome_fantasia || company?.nome_empresa || ''),
        papel: String(userType?.name || '')
      };
      })
      .filter((row) => row.id)
      .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));

    return json(
      {
        empresas,
        vendedores,
        statusVendas: [
          { value: 'confirmada', label: 'Confirmada' },
          { value: 'pendente', label: 'Pendente' },
          { value: 'concluida', label: 'Concluída' },
          { value: 'cancelada', label: 'Cancelada' }
        ]
      },
      { headers: SHORT_DYNAMIC_READ_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar base analítica.');
  }
}
