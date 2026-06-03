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
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';

const MAX_TIPO_PACOTES_BODY_BYTES = 64 * 1024;

type TipoPacoteRow = {
  id: string;
  nome?: string | null;
  ativo?: boolean | null;
  rule_id?: string | null;
  fix_meta_nao_atingida?: number | null;
  fix_meta_atingida?: number | null;
  fix_super_meta?: number | null;
};

type TipoPacoteBody = {
  id?: unknown;
  nome?: unknown;
  ativo?: unknown;
  rule_id?: unknown;
  fix_meta_nao_atingida?: unknown;
  fix_meta_atingida?: unknown;
  fix_super_meta?: unknown;
};

function readTipoPacoteBody(value: unknown): TipoPacoteBody {
  if (!value || typeof value !== 'object') return {};
  const body = value as Record<string, unknown>;
  return {
    id: body.id,
    nome: body.nome,
    ativo: body.ativo,
    rule_id: body.rule_id,
    fix_meta_nao_atingida: body.fix_meta_nao_atingida,
    fix_meta_atingida: body.fix_meta_atingida,
    fix_super_meta: body.fix_super_meta
  };
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros'], 1, 'Sem acesso a Parâmetros.');
    }

    const { items } = await getCachedReadModel<{ items: TipoPacoteRow[] }>({
      key: buildReadModelCacheKey('parametros:tipo-pacotes:list', {}),
      tags: [READ_MODEL_TAGS.catalog],
      ttlMs: 300_000,
      staleTtlMs: 1_800_000,
      loader: async () => {
        const { data, error: queryError } = await client
          .from('tipo_pacotes')
          .select('id, nome, ativo, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta')
          .order('nome');

        if (queryError) throw queryError;
        return { items: (data || []) as unknown as TipoPacoteRow[] };
      }
    });

    return json({ items }, { headers: DYNAMIC_READ_HEADERS });
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

    const body = readTipoPacoteBody(bodyResult.data);
    const { id, nome, ativo, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta } = body;
    const idRaw = String(id || '').trim();

    const nomeTrimmed = String(nome || '').trim().slice(0, 120);
    if (!nomeTrimmed) return json({ error: 'Nome obrigatório.' }, { status: 400, headers: NO_STORE_HEADERS });
    if (idRaw && !isUuid(idRaw)) return json({ error: 'ID inválido.' }, { status: 400, headers: NO_STORE_HEADERS });
    const nomeBusca = sanitizePostgrestSearchTerm(nomeTrimmed, 120);

    // Verifica duplicata
    const { data: existing } = await client
      .from('tipo_pacotes')
      .select('id')
      .ilike('nome', nomeBusca || nomeTrimmed)
      .limit(1);

    if (existing && existing.length > 0 && existing[0].id !== idRaw) {
      return json({ error: 'Já existe um tipo de pacote com este nome.' }, { status: 409, headers: NO_STORE_HEADERS });
    }

    const ruleIdStr = rule_id ? String(rule_id).trim() : null;
    const payload: Record<string, unknown> = {
      nome: nomeTrimmed,
      ativo: ativo !== false,
      rule_id: ruleIdStr && isUuid(ruleIdStr) ? ruleIdStr : null,
      fix_meta_nao_atingida: fix_meta_nao_atingida != null ? Number(fix_meta_nao_atingida) : null,
      fix_meta_atingida: fix_meta_atingida != null ? Number(fix_meta_atingida) : null,
      fix_super_meta: fix_super_meta != null ? Number(fix_super_meta) : null
    };

    let result;
    if (idRaw && isUuid(idRaw)) {
      const { data: updated, error: updateError } = await client.from('tipo_pacotes').update(payload).eq('id', idRaw).select('id').single();
      if (updateError) throw updateError;
      result = updated;
    } else {
      const { data: inserted, error: insertError } = await client.from('tipo_pacotes').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = inserted;
    }

    invalidateCatalogReadModels({ userId: user.id });
    return json({ ok: true, id: result?.id }, { headers: NO_STORE_HEADERS });
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
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400, headers: NO_STORE_HEADERS });

    const { error: deleteError } = await client.from('tipo_pacotes').delete().eq('id', id);
    if (deleteError) throw deleteError;

    invalidateCatalogReadModels({ userId: user.id });
    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir tipo de pacote.');
  }
}
