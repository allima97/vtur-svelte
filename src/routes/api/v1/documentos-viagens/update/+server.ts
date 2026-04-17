import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['documentos_viagens', 'operacao'], 3, 'Sem permissao para editar documentos.');
    }

    const body = await event.request.json();
    const id = String(body?.id || '').trim();
    const displayName = String(body?.display_name || '').trim();
    if (!isUuid(id)) return json({ error: 'id invalido.' }, { status: 400 });
    if (!displayName) return json({ error: 'display_name obrigatorio.' }, { status: 400 });

    const { data, error } = await client
      .from('documentos_viagens')
      .update({ display_name: displayName, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('id', id)
      .select('id, file_name, display_name, storage_bucket, storage_path, mime_type, size_bytes, created_at, updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: 'Documento nao encontrado.' }, { status: 404 });

    return json({ ok: true, doc: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar documento.');
  }
}
