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

    const { searchParams } = event.url;
    const status = String(searchParams.get('status') || '').trim();

    let query = client
      .from('campanhas')
      .select('id, company_id, titulo, imagem_url, imagem_path, link_url, link_instagram, link_facebook, data_campanha, validade_ate, regras, status, created_at, arquivada_em')
      .order('data_campanha', { ascending: false })
      .limit(200);

    if (scope.companyId && !scope.isAdmin) query = query.eq('company_id', scope.companyId);
    if (status) query = query.eq('status', status);

    const { data, error: queryError } = await query;
    if (queryError) throw queryError;

    return json({ items: data || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar campanhas.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      return json({ error: 'Somente gestor/master podem gerenciar campanhas.' }, { status: 403 });
    }

    const body = await event.request.json();
    const { id, titulo, imagem_url, link_url, link_instagram, link_facebook, data_campanha, validade_ate, regras, status } = body;

    if (!String(titulo || '').trim()) return json({ error: 'Título obrigatório.' }, { status: 400 });
    if (!String(data_campanha || '').trim()) return json({ error: 'Data da campanha obrigatória.' }, { status: 400 });

    const payload = {
      company_id: scope.companyId,
      titulo: String(titulo).trim(),
      imagem_url: String(imagem_url || '').trim() || null,
      link_url: String(link_url || '').trim() || null,
      link_instagram: String(link_instagram || '').trim() || null,
      link_facebook: String(link_facebook || '').trim() || null,
      data_campanha: String(data_campanha).trim(),
      validade_ate: String(validade_ate || '').trim() || null,
      regras: String(regras || '').trim() || null,
      status: String(status || 'ativa').trim()
    };

    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client.from('campanhas').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client.from('campanhas').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = data;
    }

    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar campanha.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      return json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const { error: deleteError } = await client.from('campanhas').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir campanha.');
  }
}
