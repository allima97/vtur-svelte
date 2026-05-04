import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import { rejectCrossOriginRequest, rejectLargePayload } from '$lib/server/requestGuards';
import { resolveThemeAssetMeta } from '$lib/cards/themeAssetMeta';

const MAX_ADMIN_CRM_BODY_BYTES = 256 * 1024;

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['admin', 'parametros_avisos', 'avisos', 'parametros'], 1, 'Sem acesso ao CRM Admin.');
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
      .select('id, nome, categoria_id, asset_url, storage_path, scope, greeting_text, mensagem_max_linhas, mensagem_max_palavras, assinatura_max_linhas, assinatura_max_palavras, ativo')
      .order('nome')
      .limit(200);

    // Templates de mensagem
    const { data: templates } = await client
      .from('user_message_templates')
      .select('id, nome, categoria, titulo, corpo, scope, ativo')
      .order('nome')
      .limit(200);

    return json(
      {
        categorias: categorias || [],
        temas: (temas || []).map((tema) => ({
          ...tema,
          asset_url: resolveThemeAssetMeta(tema).asset_url
        })),
        templates: templates || []
      },
      { headers: DYNAMIC_READ_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar CRM Admin.');
  }
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const payloadError = rejectLargePayload(event.request, MAX_ADMIN_CRM_BODY_BYTES);
    if (payloadError) return payloadError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['admin', 'parametros_avisos', 'avisos', 'parametros'], 3, 'Sem permissão para editar CRM Admin.');
    }

    const body = await event.request.json().catch(() => ({}));
    const { entity, action, data: payload, id } = body;

    const tableMap: Record<string, string> = {
      categoria: 'crm_template_categories',
      tema: 'user_message_template_themes',
      template: 'user_message_templates'
    };

    const table = tableMap[entity];
    if (!table) return json({ error: 'Entidade inválida.' }, { status: 400, headers: NO_STORE_HEADERS });

    if (action === 'delete') {
      if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400, headers: NO_STORE_HEADERS });
      const { error: deleteError } = await client.from(table).delete().eq('id', id);
      if (deleteError) throw deleteError;
      return json({ ok: true }, { headers: NO_STORE_HEADERS });
    }

    if (action === 'upsert') {
      if (id && isUuid(id)) {
        const { error: updateError } = await client.from(table).update(payload).eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await client.from(table).insert(payload);
        if (insertError) throw insertError;
      }
      return json({ ok: true }, { headers: NO_STORE_HEADERS });
    }

    return json({ error: 'Ação inválida.' }, { status: 400, headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar CRM Admin.');
  }
}
