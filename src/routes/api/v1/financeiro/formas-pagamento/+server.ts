import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyId,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import {
  invalidateReadModelCache,
  READ_MODEL_TAGS,
  scopeCacheTags
} from '$lib/server/readModelCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import { chunkArray } from '$lib/utils/array';

const FORMA_PAGAMENTO_SELECT =
  'id, company_id, nome, descricao, paga_comissao, permite_desconto, desconto_padrao_pct, ativo, created_at, updated_at';
const MAX_FORMA_PAGAMENTO_BODY_BYTES = 16 * 1024;

function invalidateFinancePaymentModels(companyId: string | null | undefined, userId: string) {
  invalidateReadModelCache({
    tags: [
      READ_MODEL_TAGS.finance,
      READ_MODEL_TAGS.payments,
      READ_MODEL_TAGS.sales,
      READ_MODEL_TAGS.comissoes,
      READ_MODEL_TAGS.vendasKpis,
      READ_MODEL_TAGS.dashboard
    ],
    scopeTags: scopeCacheTags({ companyIds: companyId ? [companyId] : [], userId })
  });
}

// GET - Listar formas de pagamento
export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro'], 1, 'Sem acesso ao Financeiro.');
    }

    const { searchParams } = event.url;
    const ativas = searchParams.get('ativas');
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id'));

    const items: any[] = [];
    const companyBatches = companyIds.length > 0 ? chunkArray(companyIds) : [null];
    for (const companyBatch of companyBatches) {
      let query = client
        .from('formas_pagamento')
        .select(FORMA_PAGAMENTO_SELECT)
        .order('nome', { ascending: true });

      if (ativas === 'true') {
        query = query.eq('ativo', true);
      }

      if (companyBatch) {
        query = query.in('company_id', companyBatch);
      }

      const { data, error } = await query;

      if (error) {
        // Tabela formas_pagamento pode não existir — retorna lista vazia
        if (String(error.code || '').includes('42P01') || String(error.message || '').includes('does not exist')) {
          return json({ success: true, items: [] }, { headers: DYNAMIC_READ_HEADERS });
        }
        throw error;
      }
      items.push(...(data || []));
    }

    return json({ success: true, items }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar formas de pagamento.');
  }
}

// POST - Criar nova forma de pagamento
export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_FORMA_PAGAMENTO_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['financeiro'], 2, 'Sem permissão para criar formas de pagamento.');

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const companyId = resolveScopedCompanyId(scope, body.empresa_id || body.company_id);

    // Validar campos obrigatórios
    if (!body.nome) {
      return json(
        { success: false, error: 'Nome é obrigatório.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    if (!companyId) {
      return json(
        { success: false, error: 'Selecione uma empresa para criar forma de pagamento.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { data, error } = await client
      .from('formas_pagamento')
      .insert([{
        company_id: companyId,
        nome: body.nome,
        descricao: body.descricao || null,
        paga_comissao: body.paga_comissao !== false,
        permite_desconto: Boolean(body.permite_desconto),
        desconto_padrao_pct: body.desconto_padrao_pct || null,
        ativo: body.ativo !== undefined ? body.ativo : true
      }])
      .select(FORMA_PAGAMENTO_SELECT)
      .single();

    if (error) {
      if (error.code === '23505') {
        return json(
          { success: false, error: 'Já existe uma forma de pagamento com este código.' },
          { status: 409, headers: NO_STORE_HEADERS }
        );
      }
      throw error;
    }

    invalidateFinancePaymentModels(companyId, user.id);
    return json({ success: true, item: data }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao criar forma de pagamento.');
  }
}

// PATCH - Atualizar forma de pagamento
export async function PATCH(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_FORMA_PAGAMENTO_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['financeiro'], 3, 'Sem permissão para editar formas de pagamento.');

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};

    if (!isUuid(String(body.id || ''))) {
      return json(
        { success: false, error: 'ID da forma de pagamento inválido.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.descricao !== undefined) updateData.descricao = body.descricao;
    if (body.paga_comissao !== undefined) updateData.paga_comissao = body.paga_comissao;
    if (body.permite_desconto !== undefined) updateData.permite_desconto = body.permite_desconto;
    if (body.desconto_padrao_pct !== undefined) updateData.desconto_padrao_pct = body.desconto_padrao_pct;
    if (body.ativo !== undefined) updateData.ativo = body.ativo;

    const { data: existing, error: existingError } = await client
      .from('formas_pagamento')
      .select('id, company_id')
      .eq('id', body.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return json({ success: false, error: 'Forma de pagamento não encontrada.' }, { status: 404, headers: NO_STORE_HEADERS });
    }
    if (!scope.isAdmin && !scope.companyIds.includes(String(existing.company_id || ''))) {
      return json({ success: false, error: 'Forma de pagamento fora do escopo.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const { data, error } = await client
      .from('formas_pagamento')
      .update(updateData)
      .eq('id', body.id)
      .eq('company_id', existing.company_id)
      .select(FORMA_PAGAMENTO_SELECT)
      .single();

    if (error) throw error;

    invalidateFinancePaymentModels(existing.company_id, user.id);
    return json({ success: true, item: data }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar forma de pagamento.');
  }
}

// DELETE - Excluir forma de pagamento
export async function DELETE(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['financeiro'], 4, 'Sem permissão para excluir formas de pagamento.');

    const { searchParams } = event.url;
    const id = searchParams.get('id');

    if (!isUuid(id)) {
      return json(
        { success: false, error: 'ID da forma de pagamento inválido.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { data: existing, error: existingError } = await client
      .from('formas_pagamento')
      .select('id, company_id')
      .eq('id', id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return json({ success: false, error: 'Forma de pagamento não encontrada.' }, { status: 404, headers: NO_STORE_HEADERS });
    }
    if (!scope.isAdmin && !scope.companyIds.includes(String(existing.company_id || ''))) {
      return json({ success: false, error: 'Forma de pagamento fora do escopo.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    // Verificar se há pagamentos associados (tabela vendas_pagamentos)
    const { count, error: countError } = await client
      .from('vendas_pagamentos')
      .select('id', { count: 'exact', head: true })
      .eq('forma_pagamento_id', id);

    if (countError) {
      // Ignora erro de contagem — exclui diretamente
    } else if (count && count > 0) {
      // Em vez de excluir, apenas inativar
      const { data, error } = await client
        .from('formas_pagamento')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', existing.company_id)
        .select(FORMA_PAGAMENTO_SELECT)
        .single();

      if (error) throw error;

      invalidateFinancePaymentModels(existing.company_id, user.id);
      return json(
        {
          success: true,
          item: data,
          message: 'Forma de pagamento inativada pois possui pagamentos associados.'
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const { error } = await client
      .from('formas_pagamento')
      .delete()
      .eq('id', id)
      .eq('company_id', existing.company_id);

    if (error) throw error;

    invalidateFinancePaymentModels(existing.company_id, user.id);
    return json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir forma de pagamento.');
  }
}
