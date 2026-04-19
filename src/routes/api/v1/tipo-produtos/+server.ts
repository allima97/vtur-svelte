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
      ensureModuloAccess(scope, ['cadastros', 'parametros'], 1, 'Sem acesso a Tipos de Produto.');
    }

    const all = event.url.searchParams.get('all') === '1';

    // Tenta com todas as colunas, faz fallback para colunas básicas se falhar
    let query = client
      .from('tipo_produtos')
      .select('id, nome, tipo, descricao, ativo, soma_na_meta, regra_comissionamento, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral, exibe_kpi_comissao, created_at')
      .order('nome', { ascending: true })
      .limit(200);

    if (!all) query = query.eq('ativo', true);

    let { data, error } = await query;

    // Se falhar por colunas inexistentes, tenta com colunas básicas
    if (error && (String(error.code || '').includes('42703') || String(error.message || '').includes('does not exist'))) {
      const fallback = await client
        .from('tipo_produtos')
        .select('id, nome, tipo, descricao, ativo, created_at')
        .order('nome', { ascending: true })
        .limit(200);
      if (!fallback.error) {
        data = fallback.data as any;
        error = null;
      }
    }

    if (error) throw error;

    // Busca regras de comissão para o formulário
    const { data: regras } = await client
      .from('commission_rule')
      .select('id, nome, tipo')
      .eq('ativo', true)
      .order('nome')
      .limit(100);

    return json({
      items: data || [],
      regras: regras || []
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar tipos de produto.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros'], 2, 'Sem permissão para salvar tipos de produto.');
    }

    const body = await event.request.json();
    const { id, nome, tipo, descricao, ativo, soma_na_meta, regra_comissionamento,
      usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct,
      descontar_meta_geral, exibe_kpi_comissao } = body;

    const nomeTrimmed = String(nome || '').trim();
    if (!nomeTrimmed) return json({ error: 'Nome obrigatório.' }, { status: 400 });

    const payload = {
      nome: nomeTrimmed,
      tipo: String(tipo || 'servico').trim(),
      descricao: String(descricao || '').trim() || null,
      ativo: ativo !== false,
      soma_na_meta: Boolean(soma_na_meta),
      regra_comissionamento: String(regra_comissionamento || 'geral').trim() === 'diferenciado' ? 'diferenciado' : 'geral',
      usa_meta_produto: Boolean(usa_meta_produto),
      meta_produto_valor: meta_produto_valor != null ? Number(meta_produto_valor) : null,
      comissao_produto_meta_pct: comissao_produto_meta_pct != null ? Number(comissao_produto_meta_pct) : null,
      descontar_meta_geral: Boolean(descontar_meta_geral),
      exibe_kpi_comissao: Boolean(exibe_kpi_comissao)
    };

    let result;
    if (id && isUuid(id)) {
      const { data: updated, error: updateError } = await client.from('tipo_produtos').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = updated;
    } else {
      const { data: inserted, error: insertError } = await client.from('tipo_produtos').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = inserted;
    }

    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar tipo de produto.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros'], 5, 'Sem permissão para excluir tipos de produto.');
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const { error: deleteError } = await client.from('tipo_produtos').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir tipo de produto.');
  }
}
