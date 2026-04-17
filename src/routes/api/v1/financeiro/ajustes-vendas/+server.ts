import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchGestorEquipeIdsComGestor,
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
      ensureModuloAccess(scope, ['conciliacao', 'vendas_consulta', 'vendas'], 1, 'Sem acesso a Ajustes de Vendas.');
    }

    const { searchParams } = event.url;
    const inicio = String(searchParams.get('inicio') || '').trim();
    const fim = String(searchParams.get('fim') || '').trim();
    const vendedorId = String(searchParams.get('vendedor_id') || '').trim();
    const q = String(searchParams.get('q') || '').trim();

    let equipeIds: string[] | null = null;
    if (scope.isGestor) {
      equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
    }

    let query = client
      .from('vendas_recibos')
      .select(`
        id,
        venda_id,
        numero_recibo,
        valor_total,
        valor_taxas,
        produto_resolvido:produtos!produto_resolvido_id(
          id, nome,
          tipo_produto:tipo_produtos!tipo_produto_id(id, nome, soma_na_meta)
        ),
        venda:vendas!venda_id(
          id,
          data_venda,
          cancelada,
          vendedor_id,
          vendedor:users!vendedor_id(id, nome_completo),
          cliente:clientes!cliente_id(id, nome)
        ),
        rateio:vendas_recibos_rateio(
          id, ativo, vendedor_destino_id, percentual_origem, percentual_destino, observacao, updated_at,
          vendedor_destino:users!vendedor_destino_id(id, nome_completo)
        )
      `)
      .eq('venda.cancelada', false)
      .order('venda.data_venda', { ascending: false })
      .limit(120);

    if (scope.companyId && !scope.isAdmin) {
      query = query.eq('venda.company_id', scope.companyId);
    }
    if (inicio) query = query.gte('venda.data_venda', inicio);
    if (fim) query = query.lte('venda.data_venda', fim);
    if (vendedorId && isUuid(vendedorId)) query = query.eq('venda.vendedor_id', vendedorId);
    if (equipeIds && equipeIds.length > 0) query = query.in('venda.vendedor_id', equipeIds);

    const { data, error: queryError } = await query;
    if (queryError) {
      if (String(queryError.code || '').includes('42P01')) {
        return json({ items: [], vendedores: [] });
      }
      throw queryError;
    }

    let items = (data || []).map((row: any) => {
      const tipoProduto = row.produto_resolvido?.tipo_produto;
      const somaNaMeta = tipoProduto?.soma_na_meta ?? null;
      return {
        id: `vr:${row.id}`,
        recibo_origem_id: row.id,
        venda_id: row.venda_id,
        numero_recibo: row.numero_recibo || '-',
        data_venda: row.venda?.data_venda || null,
        valor_total: Number(row.valor_total || 0),
        valor_taxas: Number(row.valor_taxas || 0),
        vendedor_origem_id: row.venda?.vendedor_id || '',
        vendedor_origem_nome: row.venda?.vendedor?.nome_completo || 'Vendedor',
        cliente_nome: row.venda?.cliente?.nome || 'Cliente',
        produto_nome: row.produto_resolvido?.nome || '-',
        produto_tipo_nome: tipoProduto?.nome || null,
        soma_na_meta: somaNaMeta,
        rateio: Array.isArray(row.rateio) ? (row.rateio[0] || null) : (row.rateio || null)
      };
    });

    if (q) {
      const qLower = q.toLowerCase();
      items = items.filter((item: any) =>
        [item.numero_recibo, item.cliente_nome, item.vendedor_origem_nome, item.produto_nome]
          .join(' ').toLowerCase().includes(qLower)
      );
    }

    let vendedoresQuery = client
      .from('users')
      .select('id, nome_completo')
      .eq('active', true)
      .order('nome_completo')
      .limit(100);
    if (scope.companyId && !scope.isAdmin)
      vendedoresQuery = vendedoresQuery.eq('company_id', scope.companyId);
    const { data: vendedoresData } = await vendedoresQuery;

    return json({ items, vendedores: vendedoresData || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar ajustes de vendas.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ['conciliacao', 'vendas_consulta', 'vendas'],
        3,
        'Sem permissão para editar Ajustes de Vendas.'
      );
    }

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      return json(
        { error: 'Somente gestor/master podem editar Ajustes de Vendas.' },
        { status: 403 }
      );
    }

    const body = await event.request.json();
    const { ajuste_id, venda_recibo_id, vendedor_destino_id, percentual_destino, observacao } =
      body;

    const rawId = String(ajuste_id || venda_recibo_id || '')
      .replace(/^vr:/, '')
      .replace(/^cr:/, '')
      .trim();
    if (!isUuid(rawId)) return json({ error: 'ID do recibo inválido.' }, { status: 400 });

    const pct = Number(percentual_destino);
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) {
      return json({ error: 'Percentual deve ser >= 0 e < 100.' }, { status: 400 });
    }

    if (!isUuid(vendedor_destino_id)) {
      return json({ error: 'Vendedor destino inválido.' }, { status: 400 });
    }

    const companyId = scope.companyId;
    if (!companyId && !scope.isAdmin) {
      return json({ error: 'Empresa não identificada.' }, { status: 400 });
    }

    // ✅ Ownership: confirma que o recibo pertence à empresa do scope via join
    const { data: reciboRow, error: reciboErr } = await client
      .from('vendas_recibos')
      .select('id, vendas!inner(company_id)')
      .eq('id', rawId)
      .maybeSingle();

    if (reciboErr) throw reciboErr;
    if (!reciboRow) return json({ error: 'Recibo não encontrado.' }, { status: 404 });

    const reciboCompany = (reciboRow as any)?.vendas?.company_id;
    if (!scope.isAdmin && reciboCompany !== companyId) {
      return json({ error: 'Recibo fora do escopo da empresa.' }, { status: 403 });
    }

    // ✅ Confirma que o produto do recibo soma na meta (produtos diferenciados)
    const { data: reciboProduto } = await client
      .from('vendas_recibos')
      .select(
        'produto_resolvido_id, produtos!produto_resolvido_id(tipo_produto_id, tipo_produtos!tipo_produto_id(soma_na_meta))'
      )
      .eq('id', rawId)
      .maybeSingle();

    const somaNaMeta =
      (reciboProduto as any)?.produtos?.tipo_produtos?.soma_na_meta ?? null;

    // ✅ Confirma que o vendedor destino pertence à mesma empresa
    const { data: vendedorRow } = await client
      .from('users')
      .select('id, company_id')
      .eq('id', vendedor_destino_id)
      .maybeSingle();

    if (!vendedorRow) return json({ error: 'Vendedor destino não encontrado.' }, { status: 404 });
    if (!scope.isAdmin && vendedorRow.company_id !== companyId) {
      return json({ error: 'Vendedor destino fora do escopo da empresa.' }, { status: 403 });
    }

    const payload = {
      venda_recibo_id: rawId,
      company_id: reciboCompany ?? companyId,
      vendedor_destino_id,
      percentual_origem: 100 - pct,
      percentual_destino: pct,
      observacao: String(observacao || '').trim() || null,
      ativo: true
    };

    const { data: existing } = await client
      .from('vendas_recibos_rateio')
      .select('id')
      .eq('venda_recibo_id', rawId)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await client
        .from('vendas_recibos_rateio')
        .update(payload)
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client
        .from('vendas_recibos_rateio')
        .insert(payload);
      if (insertError) throw insertError;
    }

    return json({ ok: true, soma_na_meta: somaNaMeta });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar ajuste de venda.');
  }
}
