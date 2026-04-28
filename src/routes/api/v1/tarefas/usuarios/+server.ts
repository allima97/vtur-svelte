import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_todo', 'tarefas', 'operacao'], 1, 'Sem acesso a Tarefas.');
    }

    const companyIds = event.url.searchParams.get('empresa_id');

    // Busca usuários ativos para select de responsável
    let query = client
      .from('users')
      .select('id, nome_completo, email, company_id')
      .eq('active', true)
      .order('nome_completo', { ascending: true })
      .limit(500);

    if (companyIds) {
      query = query.eq('company_id', companyIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Tarefas Usuarios API] Erro:', error.message, error.code);
      throw error;
    }

    const items = (data || []).map((row: any) => ({
      id: row.id,
      nome: row.nome_completo || row.email,
      email: row.email
    }));

    return json({ items, total: items.length });
  } catch (err) {
    console.error('[Tarefas Usuarios API] Erro:', err);
    return toErrorResponse(err, 'Erro ao carregar usuários.');
  }
}
