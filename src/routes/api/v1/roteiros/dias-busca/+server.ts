import { json, type RequestEvent } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  ensureModuloAccess,
  toErrorResponse
} from '$lib/server/v1';

function shouldScopeByOwner(scope: { isAdmin?: boolean; isGestor?: boolean; isMaster?: boolean }) {
  return !scope.isAdmin && !scope.isGestor && !scope.isMaster;
}

function isMissingPercursoColumn(error: any) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  return (
    code === '42703' ||
    (/percurso/i.test(msg) &&
      /does not exist|nao existe|não existe|unknown column|column/i.test(msg))
  );
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['Orcamentos'], 1, 'Sem acesso a Roteiros.');

    const q = event.url.searchParams.get('q') || '';
    const cidade = event.url.searchParams.get('cidade') || '';
    const companyId = scope.companyId;

    const runQuery = async (withPercurso: boolean) => {
      let query = client
        .from('roteiro_dia')
        .select(
          withPercurso
            ? 'id, percurso, cidade, descricao, data, roteiro_id'
            : 'id, cidade, descricao, data, roteiro_id'
        )
        .order('created_at', { ascending: false })
        .limit(20);

      if (!shouldScopeByOwner(scope) && companyId && !scope.isAdmin && !scope.isMaster) {
        query = query.eq('company_id', companyId);
      } else {
        if (shouldScopeByOwner(scope)) {
          query = query.eq('created_by', user.id);
        }
      }

      if (cidade) {
        query = query.ilike('cidade', `%${cidade}%`);
      }

      if (q) {
        if (withPercurso) {
          query = query.or(`descricao.ilike.%${q}%,percurso.ilike.%${q}%`);
        } else {
          query = query.ilike('descricao', `%${q}%`);
        }
      }

      return await query;
    };

    let data: any[] | null = null;
    let fetchError: any = null;

    const res1 = await runQuery(true);
    data = (res1 as any).data;
    fetchError = (res1 as any).error;

    if (fetchError && isMissingPercursoColumn(fetchError)) {
      const res2 = await runQuery(false);
      data = (res2 as any).data;
      fetchError = (res2 as any).error;
    }

    if (fetchError) throw fetchError;

    return json({ dias: data || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao buscar dias.');
  }
}
