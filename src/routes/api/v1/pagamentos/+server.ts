import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
  normalizeText
} from '$lib/server/v1';

// GET - Listar pagamentos
export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['financeiro'], 1, 'Sem acesso ao Financeiro.');
    }

    const { searchParams } = event.url;
    const vendaId = searchParams.get('venda_id');
    const formaPagamentoId = searchParams.get('forma_pagamento_id');
    const busca = searchParams.get('q');
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id'));

    let query = client
      .from('vendas_pagamentos')
      .select(`
        id, venda_id, forma_pagamento_id, company_id, forma_nome, operacao, plano,
        valor_bruto, desconto_valor, valor_total, parcelas_qtd, parcelas_valor,
        vencimento_primeira, paga_comissao, observacoes, created_at, updated_at,
        venda:vendas!venda_id(id, numero_venda),
        forma_pagamento:formas_pagamento!forma_pagamento_id(id, nome)
      `)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (vendaId) query = query.eq('venda_id', vendaId);
    if (formaPagamentoId) query = query.eq('forma_pagamento_id', formaPagamentoId);
    if (companyIds.length > 0) query = query.in('company_id', companyIds);

    const { data, error } = await query;
    if (error) throw error;

    let items = (data || []) as any[];

    if (busca) {
      const buscaNormalizada = normalizeText(busca);
      items = items.filter((p) => {
        const texto = normalizeText(
          [p.venda?.numero_venda, p.forma_nome, p.forma_pagamento?.nome, p.observacoes].join(' ')
        );
        return texto.includes(buscaNormalizada);
      });
    }

    return json({ success: true, items });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar pagamentos.');
  }
}

// POST - Criar novo pagamento de venda
export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['financeiro'], 2, 'Sem permissao para criar pagamentos.');

    const body = await event.request.json();

    if (!isUuid(body.venda_id)) {
      return json({ success: false, error: 'ID da venda invalido.' }, { status: 400 });
    }

    if (body.forma_pagamento_id && !isUuid(body.forma_pagamento_id)) {
      return json({ success: false, error: 'ID da forma de pagamento invalido.' }, { status: 400 });
    }

    // Verificar se a venda pertence ao escopo da empresa do usuario
    if (!scope.isAdmin) {
      const { data: venda, error: vendaErr } = await client
        .from('vendas')
        .select('id, company_id')
        .eq('id', body.venda_id)
        .maybeSingle();

      if (vendaErr) throw vendaErr;
      if (!venda) {
        return json({ success: false, error: 'Venda nao encontrada.' }, { status: 404 });
      }
      if (scope.companyId && String(venda.company_id || '') !== scope.companyId) {
        return json({ success: false, error: 'Venda fora do escopo da empresa.' }, { status: 403 });
      }
    }

    const { data, error } = await client
      .from('vendas_pagamentos')
      .insert([{
        venda_id: body.venda_id,
        company_id: scope.companyId,
        forma_pagamento_id: body.forma_pagamento_id || null,
        forma_nome: body.forma_nome || body.forma_pagamento || null,
        operacao: body.operacao || null,
        plano: body.plano || null,
        valor_bruto: body.valor_bruto || body.valor || null,
        desconto_valor: body.desconto_valor || null,
        valor_total: body.valor_total || body.valor || null,
        parcelas: body.parcelas || null,
        parcelas_qtd: body.parcelas_qtd || null,
        parcelas_valor: body.parcelas_valor || null,
        vencimento_primeira: body.vencimento_primeira || null,
        paga_comissao: body.paga_comissao ?? null,
        observacoes: body.observacoes || null
      }])
      .select()
      .single();

    if (error) throw error;

    return json({ success: true, item: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao criar pagamento.');
  }
}
