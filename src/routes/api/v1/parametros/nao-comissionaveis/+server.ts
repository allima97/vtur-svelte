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
      ensureModuloAccess(scope, ['Admin'], 1, 'Sem acesso.');
    }

    let query = client
      .from('parametros_pagamentos_nao_comissionaveis')
      .select('id, termo, termo_normalizado, ativo, created_at')
      .order('termo');

    const { data, error: queryError } = await query.limit(200);
    if (queryError) throw queryError;

    return json({ items: data || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar termos não comissionáveis.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Admin'], 2, 'Sem permissão.');
    }

    const body = await event.request.json();
    const { id, termo, descricao, ativo } = body;

    if (!String(termo || '').trim()) return json({ error: 'Termo obrigatório.' }, { status: 400 });

    const payload = {
      termo: String(termo).trim(),
      termo_normalizado: String(termo).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' '),
      ativo: ativo !== false,
      created_by: scope.userId
    };

    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client.from('parametros_pagamentos_nao_comissionaveis').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client.from('parametros_pagamentos_nao_comissionaveis').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = data;
    }

    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar termo.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Admin'], 4, 'Sem permissão.');
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const { error: deleteError } = await client.from('parametros_pagamentos_nao_comissionaveis').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir termo.');
  }
}
