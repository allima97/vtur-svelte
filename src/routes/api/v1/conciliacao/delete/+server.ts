import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['conciliacao'], 4, 'Sem permissão para excluir registros de conciliação.');
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const companyIds = resolveScopedCompanyIds(scope, null);

    // Verifica escopo
    const { data: registro } = await client
      .from('conciliacao_recibos')
      .select('id, company_id')
      .eq('id', id)
      .maybeSingle();

    if (!registro) return json({ error: 'Registro não encontrado.' }, { status: 404 });
    if (!scope.isAdmin && companyIds.length > 0 && !companyIds.includes(registro.company_id)) {
      return json({ error: 'Registro fora do escopo.' }, { status: 403 });
    }

    const { error: deleteError } = await client.from('conciliacao_recibos').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir registro de conciliação.');
  }
}
