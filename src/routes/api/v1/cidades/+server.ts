import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  parseIntSafe,
  requireAuthenticatedUser,
  resolveUserScope,
  sanitizePostgrestSearchTerm,
  toErrorResponse
} from '$lib/server/v1';
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  invalidateCatalogReadModels,
  READ_MODEL_TAGS
} from '$lib/server/readModelCache';
import { rejectCrossOriginRequest, rejectLargePayload } from '$lib/server/requestGuards';

const MAX_CIDADES_BODY_BYTES = 64 * 1024;

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Cidades'], 1, 'Sem acesso a Cidades.');
    }

    const { searchParams } = event.url;
    const rawQ = sanitizePostgrestSearchTerm(searchParams.get('q'), 80);
    const q = rawQ.length >= 2 ? rawQ : '';
    const subdivisaoId = String(searchParams.get('subdivisao_id') || '').trim();
    const page = Math.max(1, parseIntSafe(searchParams.get('page'), 1));
    const pageSize = Math.min(100, Math.max(1, parseIntSafe(searchParams.get('pageSize'), 50)));

    const selectFields = `
        id, nome, subdivisao_id, descricao, created_at,
        subdivisao:subdivisoes!subdivisao_id(id, nome, pais_id, pais:paises!pais_id(id, nome))
      `;

    const { items, total } = await getCachedReadModel<{ items: any[]; total: number }>({
      key: buildReadModelCacheKey('cidades:list', {
        q,
        subdivisaoId,
        page,
        pageSize
      }),
      tags: [READ_MODEL_TAGS.catalog],
      ttlMs: 60_000,
      staleTtlMs: 300_000,
      loader: async () => {
        let query = client
          .from('cidades')
          .select(selectFields, { count: 'exact' })
          .order('nome')
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (subdivisaoId) query = query.eq('subdivisao_id', subdivisaoId);
        if (q) {
          query = query.or(`nome.ilike.%${q}%,descricao.ilike.%${q}%`);
        }

        const { data, count, error: queryError } = await query;
        if (queryError) throw queryError;

        return {
          items: data || [],
          total: Number(count ?? data?.length ?? 0)
        };
      }
    });

    return json({ items, total, page, pageSize });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar cidades.');
  }
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const payloadError = rejectLargePayload(event.request, MAX_CIDADES_BODY_BYTES);
    if (payloadError) return payloadError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Cidades'], 2, 'Sem permissão para salvar cidades.');
    }

    const body = await event.request.json().catch(() => ({}));
    const { id, nome, subdivisao_id, descricao } = body;

    if (!String(nome || '').trim()) return json({ error: 'Nome obrigatório.' }, { status: 400 });
    if (!subdivisao_id || !isUuid(subdivisao_id)) return json({ error: 'Estado/Subdivisão obrigatório.' }, { status: 400 });

    const payload = {
      nome: String(nome).trim(),
      subdivisao_id,
      descricao: String(descricao || '').trim() || null
    };

    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client.from('cidades').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client.from('cidades').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = data;
    }

    invalidateCatalogReadModels({ userId: user.id });
    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar cidade.');
  }
}

export async function DELETE(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Cidades'], 4, 'Sem permissão para excluir cidades.');
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const { error: deleteError } = await client.from('cidades').delete().eq('id', id);
    if (deleteError) throw deleteError;

    invalidateCatalogReadModels({ userId: user.id });
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir cidade.');
  }
}
