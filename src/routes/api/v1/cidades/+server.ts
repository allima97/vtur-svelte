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
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';

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
    const pageSize = Math.min(5000, Math.max(1, parseIntSafe(searchParams.get('pageSize'), 200)));

    if (subdivisaoId && !isUuid(subdivisaoId)) {
      return json({ error: 'subdivisao_id inválido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

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
        // count exact + join pode ficar muito pesado em bases grandes.
        // Para UX de busca rápida nesta tela, priorizamos latência e retornamos
        // total baseado no lote carregado.
        let query = client
          .from('cidades')
          .select(selectFields)
          .order('nome')
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (subdivisaoId) query = query.eq('subdivisao_id', subdivisaoId);
        if (q) {
          query = query.or(`nome.ilike.%${q}%,descricao.ilike.%${q}%`);
        }

        const { data, error: queryError } = await query;
        if (queryError) throw queryError;

        const rows = data || [];
        return {
          items: rows,
          total: rows.length
        };
      }
    });

    return json({ items, total, page, pageSize }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar cidades.');
  }
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_CIDADES_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Cidades'], 2, 'Sem permissão para salvar cidades.');
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const { id, nome, subdivisao_id, descricao } = body;

    if (!String(nome || '').trim()) return json({ error: 'Nome obrigatório.' }, { status: 400, headers: NO_STORE_HEADERS });
    if (!subdivisao_id || !isUuid(subdivisao_id)) return json({ error: 'Estado/Subdivisão obrigatório.' }, { status: 400, headers: NO_STORE_HEADERS });

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
    return json({ ok: true, id: result?.id }, { headers: NO_STORE_HEADERS });
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
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400, headers: NO_STORE_HEADERS });

    const { error: deleteError } = await client.from('cidades').delete().eq('id', id);
    if (deleteError) throw deleteError;

    invalidateCatalogReadModels({ userId: user.id });
    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir cidade.');
  }
}
