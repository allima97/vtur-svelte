import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
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
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';

const MAX_TIPO_PACOTES_BODY_BYTES = 64 * 1024;

function parseDecimal(value: any) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros'], 1, 'Sem acesso a Parâmetros.');
    }

    const { items, regras } = await getCachedReadModel<{ items: any[]; regras: any[] }>({
      key: buildReadModelCacheKey('parametros:tipo-pacotes:list', {}),
      tags: [READ_MODEL_TAGS.catalog, READ_MODEL_TAGS.comissoes],
      ttlMs: 60_000,
      staleTtlMs: 300_000,
      loader: async () => {
        const [{ data, error: queryError }, { data: regras }] = await Promise.all([
          client
            .from('tipo_pacotes')
            .select('id, nome, ativo, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta')
            .order('nome'),
          client
            .from('commission_rule')
            .select('id, nome, tipo')
            .eq('ativo', true)
            .order('nome')
            .limit(100)
        ]);

        if (queryError) throw queryError;
        return { items: data || [], regras: regras || [] };
      }
    });

    return json({ items, regras });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar tipos de pacote.');
  }
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_TIPO_PACOTES_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros'], 2, 'Sem permissão para salvar tipos de pacote.');
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const { id, nome, ativo, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta } = body;

    const nomeTrimmed = String(nome || '').trim().slice(0, 120);
    if (!nomeTrimmed) return json({ error: 'Nome obrigatório.' }, { status: 400 });
    const nomeBusca = sanitizePostgrestSearchTerm(nomeTrimmed, 120);

    // Verifica duplicata
    const { data: existing } = await client
      .from('tipo_pacotes')
      .select('id')
      .ilike('nome', nomeBusca || nomeTrimmed)
      .limit(1);

    if (existing && existing.length > 0 && existing[0].id !== id) {
      return json({ error: 'Já existe um tipo de pacote com este nome.' }, { status: 409 });
    }

    const fixMetaNaoAtingida = parseDecimal(fix_meta_nao_atingida);
    const fixMetaAtingida = parseDecimal(fix_meta_atingida);
    const fixSuperMeta = parseDecimal(fix_super_meta);

    if (Number.isNaN(fixMetaNaoAtingida) || Number.isNaN(fixMetaAtingida) || Number.isNaN(fixSuperMeta)) {
      return json({ error: 'Percentuais invalidos. Use apenas numeros (ex: 0.8).' }, { status: 400 });
    }

    const payload = {
      nome: nomeTrimmed,
      ativo: ativo !== false,
      rule_id: rule_id && isUuid(rule_id) ? rule_id : null,
      fix_meta_nao_atingida: fixMetaNaoAtingida,
      fix_meta_atingida: fixMetaAtingida,
      fix_super_meta: fixSuperMeta
    };

    let result;
    if (id && isUuid(id)) {
      const { data: updated, error: updateError } = await client.from('tipo_pacotes').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = updated;
    } else {
      const { data: inserted, error: insertError } = await client.from('tipo_pacotes').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = inserted;
    }

    invalidateCatalogReadModels({ userId: user.id });
    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar tipo de pacote.');
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
      ensureModuloAccess(scope, ['parametros'], 5, 'Sem permissão para excluir tipos de pacote.');
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const { error: deleteError } = await client.from('tipo_pacotes').delete().eq('id', id);
    if (deleteError) throw deleteError;

    invalidateCatalogReadModels({ userId: user.id });
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir tipo de pacote.');
  }
}
