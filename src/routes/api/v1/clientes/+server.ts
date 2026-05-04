import { json } from '@sveltejs/kit';
import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveAccessibleClientIds, resolveScopedCompanyIds, resolveScopedVendedorIds, resolveUserScope, sanitizePostgrestSearchTerm, toErrorResponse } from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS } from '$lib/server/httpCache';

const SUPABASE_IN_BATCH_SIZE = 100;

type ClienteLookupRow = {
  id: string;
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  whatsapp: string | null;
  company_id: string | null;
};

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function dedupeClientes(rows: ClienteLookupRow[]) {
  const map = new Map<string, ClienteLookupRow>();
  rows.forEach((row) => {
    const id = String(row?.id || '').trim();
    if (id && !map.has(id)) map.set(id, row);
  });
  return Array.from(map.values()).sort((left, right) =>
    String(left.nome || '').localeCompare(String(right.nome || ''), 'pt-BR')
  );
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['clientes', 'vendas_consulta', 'vendas'], 1, 'Sem acesso a Clientes.');
    }

    const search = sanitizePostgrestSearchTerm(event.url.searchParams.get('search')).toLowerCase();
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('empresa_id'));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, event.url.searchParams.get('vendedor_id'));
    const tipoNome = String(scope.tipoNome || '').toUpperCase();
    const canUseCompanyScope =
      scope.isAdmin ||
      scope.isMaster ||
      tipoNome.includes('MASTER') ||
      tipoNome.includes('GESTOR');
    const accessibleClientIds = canUseCompanyScope
      ? null
      : await resolveAccessibleClientIds(client, { companyIds, vendedorIds });

    if (accessibleClientIds && accessibleClientIds.length === 0) {
      return json(
        { items: [], total: 0 },
        { headers: DYNAMIC_READ_HEADERS }
      );
    }

    const buildQuery = (clientIds?: string[]) => {
      let query = client
        .from('clientes')
        .select('id, nome, cpf, telefone, email, whatsapp, company_id')
        .order('nome', { ascending: true })
        .limit(search ? 50 : 300);

      if (clientIds) {
        query = query.in('id', clientIds);
      } else if (companyIds.length > 0) {
        query = query.in('company_id', companyIds);
      }

      if (search) {
        query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,cpf.ilike.%${search}%,telefone.ilike.%${search}%`);
      }

      return query;
    };

    const fetchClientes = async () => {
      if (accessibleClientIds && !scope.isAdmin) {
        if (accessibleClientIds.length <= SUPABASE_IN_BATCH_SIZE) {
          return buildQuery(accessibleClientIds);
        }

        const rows: ClienteLookupRow[] = [];
        for (const batch of chunkArray(accessibleClientIds)) {
          const result = await buildQuery(batch);
          if (result.error) {
            return { data: null, error: result.error } as typeof result;
          }
          rows.push(...(((result.data || []) as unknown) as ClienteLookupRow[]));
        }

        return { data: dedupeClientes(rows).slice(0, search ? 50 : 300), error: null };
      }

      return buildQuery();
    };

    const { data, error } = await fetchClientes();
    if (error) throw error;

    return json(
      { items: data || [], total: data?.length || 0 },
      { headers: DYNAMIC_READ_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar clientes.');
  }
}
