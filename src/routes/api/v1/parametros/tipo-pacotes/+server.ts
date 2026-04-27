import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  normalizeText,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

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

    const { data, error: queryError } = await client
      .from('tipo_pacotes')
      .select('id, nome, ativo, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta')
      .order('nome');

    if (queryError) throw queryError;

    // Busca regras de comissão para o formulário
    const { data: regras } = await client
      .from('commission_rule')
      .select('id, nome, tipo')
      .eq('ativo', true)
      .order('nome')
      .limit(100);

    return json({ items: data || [], regras: regras || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar tipos de pacote.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros'], 2, 'Sem permissão para salvar tipos de pacote.');
    }

    const body = await event.request.json();
    const { id, nome, ativo, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta } = body;

    const nomeTrimmed = String(nome || '').trim();
    if (!nomeTrimmed) return json({ error: 'Nome obrigatório.' }, { status: 400 });

    // Verifica duplicata
    const { data: existing } = await client
      .from('tipo_pacotes')
      .select('id')
      .ilike('nome', nomeTrimmed)
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

    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar tipo de pacote.');
  }
}

export async function DELETE(event) {
  try {
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

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir tipo de pacote.');
  }
}
