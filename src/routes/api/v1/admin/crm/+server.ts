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
      ensureModuloAccess(scope, ['admin', 'parametros'], 1, 'Sem acesso ao CRM Admin.');
    }

    // Categorias
    const { data: categorias } = await client
      .from('crm_template_categories')
      .select('id, nome, icone, sort_order, ativo')
      .order('sort_order')
      .limit(100);

    // Temas
    const { data: temas } = await client
      .from('user_message_template_themes')
      .select('id, nome, categoria_id, asset_url, scope, greeting_text, mensagem_max_linhas, mensagem_max_palavras, assinatura_max_linhas, assinatura_max_palavras, ativo')
      .order('nome')
      .limit(200);

    // Templates de mensagem
    const { data: templates } = await client
      .from('user_message_templates')
      .select('id, nome, categoria, titulo, corpo, scope, ativo')
      .order('nome')
      .limit(200);

    return json({
      categorias: categorias || [],
      temas: temas || [],
      templates: templates || []
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar CRM Admin.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['admin'], 3, 'Sem permissão para editar CRM Admin.');
    }

    const body = await event.request.json();
    const { entity, action, data: payload, id } = body;

    const tableMap: Record<string, string> = {
      categoria: 'crm_template_categories',
      tema: 'user_message_template_themes',
      template: 'user_message_templates'
    };

    const table = tableMap[entity];
    if (!table) return json({ error: 'Entidade inválida.' }, { status: 400 });

    if (action === 'delete') {
      if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });
      const { error: deleteError } = await client.from(table).delete().eq('id', id);
      if (deleteError) throw deleteError;
      return json({ ok: true });
    }

    if (action === 'upsert') {
      if (id && isUuid(id)) {
        const { error: updateError } = await client.from(table).update(payload).eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await client.from(table).insert(payload);
        if (insertError) throw insertError;
      }
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar CRM Admin.');
  }
}
