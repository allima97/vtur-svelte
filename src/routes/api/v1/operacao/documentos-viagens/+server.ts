import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
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
      ensureModuloAccess(scope, ['operacao_documentos_viagens', 'documentos_viagens', 'operacao'], 1, 'Sem acesso a Documentos de Viagens.');
    }

    const { searchParams } = event.url;
    const q = String(searchParams.get('q') || searchParams.get('busca') || '').trim();

    let query = client
      .from('documentos_viagens')
      .select(`
        id, file_name, display_name, title, template_text, template_fields, storage_bucket, storage_path, mime_type, size_bytes, created_at,
        uploader:users!uploaded_by(id, nome_completo, email)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (scope.companyId && !scope.isAdmin) query = query.eq('company_id', scope.companyId);

    const { data, error: queryError } = await query;
    if (queryError) throw queryError;

    let items = data || [];
    if (q) {
      const qLower = q.toLowerCase();
      items = items.filter((item: any) =>
        [item.file_name, item.display_name, item.title].join(' ').toLowerCase().includes(qLower)
      );
    }

    return json({ items });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar documentos de viagens.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_documentos_viagens', 'documentos_viagens', 'operacao'], 4, 'Sem permissão para excluir documentos.');
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    // Busca o documento para deletar do storage também
    const { data: doc, error: fetchErr } = await client
      .from('documentos_viagens')
      .select('company_id, storage_bucket, storage_path')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!doc) return json({ error: 'Documento não encontrado.' }, { status: 404 });

    if (!scope.isAdmin) {
      const allowedCompanyIds = new Set(
        [scope.companyId, ...(scope.companyIds || [])].map((value) => String(value || '').trim()).filter(Boolean)
      );
      const targetCompanyId = String((doc as { company_id?: string | null })?.company_id || '').trim();
      if (!targetCompanyId || !allowedCompanyIds.has(targetCompanyId)) {
        return json({ error: 'Documento fora do escopo da empresa.' }, { status: 403 });
      }
    }

    if (doc?.storage_bucket && doc?.storage_path) {
      await client.storage.from(doc.storage_bucket).remove([doc.storage_path]);
    }

    const { error: deleteError } = await client.from('documentos_viagens').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir documento.');
  }
}
