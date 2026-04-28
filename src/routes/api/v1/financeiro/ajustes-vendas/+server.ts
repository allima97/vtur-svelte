import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchGestorEquipeIdsComGestor,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao', 'vendas_consulta', 'vendas'], 1, 'Sem acesso a Ajustes de Vendas.');
    }

    const requestedCompanyId = String(event.url.searchParams.get('company_id') || '').trim();
    const companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
     if (companyIds.length === 0 && !scope.isAdmin) {
       return json({ items: [], vendedores: [] });
     }

    const { searchParams } = event.url;
    const inicio = String(searchParams.get('inicio') || '').trim();
    const fim = String(searchParams.get('fim') || '').trim();
    const vendedorId = String(searchParams.get('vendedor_id') || '').trim();
    const q = String(searchParams.get('q') || '').trim();
    const limit = 120;

    // Query principal: vendas_recibos com vendas!inner para filtrar corretamente
    let query = client
      .from('vendas_recibos')
      .select(`
        id,
        venda_id,
        numero_recibo,
        data_venda,
        valor_total,
        valor_taxas,
        vendas!inner(
          id,
          vendedor_id,
          cliente_id,
          cancelada,
          company_id,
          clientes!cliente_id(nome)
        )
      `)
      .order('data_venda', { ascending: false })
      .limit(limit);

    if (companyIds.length === 1) {
       query = query.eq('vendas.company_id', companyIds[0]);
    } else if (companyIds.length > 1) {
       query = query.in('vendas.company_id', companyIds);
     }
    query = query.eq('vendas.cancelada', false);
    if (inicio) query = query.gte('data_venda', inicio);
    if (fim) query = query.lte('data_venda', fim);
    if (vendedorId && isUuid(vendedorId)) {
      query = query.eq('vendas.vendedor_id', vendedorId);
    }
    if (q) query = (query as any).or(`numero_recibo.ilike.%${q}%`);

    const { data, error: queryError } = await query;
    if (queryError) throw queryError;

    const reciboIds = (data || []).map((r: any) => String(r.id)).filter(Boolean);

    // Busca rateios separadamente (evita joins problemáticos)
    let rateioMap = new Map<string, any>();
    if (reciboIds.length > 0) {
      const { data: rateioData, error: rateioError } = await client
        .from('vendas_recibos_rateio')
        .select(`
          id, venda_recibo_id, ativo,
          vendedor_destino_id, percentual_origem, percentual_destino, observacao, updated_at,
          vendedor_destino:users!vendedor_destino_id(id, nome_completo)
        `)
        .in('venda_recibo_id', reciboIds);

      if (rateioError && !String(rateioError.code || '').includes('42P01')) throw rateioError;
      (rateioData || []).forEach((r: any) => {
        if (r.venda_recibo_id) rateioMap.set(r.venda_recibo_id, r);
      });
    }

    // Busca nomes dos vendedores
    const vendedorIdsFromRows = [...new Set((data || []).map((r: any) => String(r.vendas?.vendedor_id || '')).filter(Boolean))];
    const vendedorNomeMap = new Map<string, string>();
    if (vendedorIdsFromRows.length > 0) {
      const { data: vData } = await client.from('users').select('id, nome_completo').in('id', vendedorIdsFromRows);
      (vData || []).forEach((v: any) => vendedorNomeMap.set(v.id, v.nome_completo));
    }

    const items = (data || []).map((row: any) => {
      const rateio = rateioMap.get(row.id) || null;
      const vendedorOrigemId = String(row.vendas?.vendedor_id || '');
      return {
        id: `vr:${row.id}`,
        recibo_origem_id: row.id,
        venda_id: String(row.venda_id || ''),
        numero_recibo: String(row.numero_recibo || '').trim() || '-',
        data_venda: String(row.data_venda || '').slice(0, 10),
        valor_total: Number(row.valor_total || 0),
        valor_taxas: Number(row.valor_taxas || 0),
        vendedor_origem_id: vendedorOrigemId,
        vendedor_origem_nome: vendedorNomeMap.get(vendedorOrigemId) || 'Vendedor',
        cliente_nome: String(row.vendas?.clientes?.nome || ''),
        rateio: rateio ? {
          id: String(rateio.id || ''),
          ativo: Boolean(rateio.ativo),
          vendedor_destino_id: String(rateio.vendedor_destino_id || ''),
          vendedor_destino: rateio.vendedor_destino || null,
          percentual_origem: Number(rateio.percentual_origem || 0),
          percentual_destino: Number(rateio.percentual_destino || 0),
          observacao: rateio.observacao || null,
          updated_at: rateio.updated_at || null
        } : null
      };
    });

    // Vendedores para o filtro
    let vendedoresQuery = client
      .from('users')
      .select('id, nome_completo')
      .eq('active', true)
      .order('nome_completo')
      .limit(100);
    if (companyIds.length === 1) {
       vendedoresQuery = vendedoresQuery.eq('company_id', companyIds[0]);
    } else if (companyIds.length > 1) {
       vendedoresQuery = vendedoresQuery.in('company_id', companyIds);
     }
    const { data: vendedoresData } = await vendedoresQuery;

    return json({ items, vendedores: (vendedoresData || []).map((v: any) => ({ id: v.id, nome_completo: v.nome_completo })) });
  } catch (err: any) {
    console.error('[ajustes-vendas] GET error:', err);
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
        ['operacao_conciliacao', 'conciliacao', 'vendas_consulta', 'vendas'],
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

    // Confirma que o recibo pertence à empresa do scope via join e obtém vendedor_origem_id
    const { data: reciboRow, error: reciboErr } = await client
      .from('vendas_recibos')
      .select('id, vendas!inner(company_id, vendedor_id, cancelada)')
      .eq('id', rawId)
      .eq('vendas.cancelada', false)
      .maybeSingle();

    if (reciboErr) throw reciboErr;
    if (!reciboRow) return json({ error: 'Recibo não encontrado.' }, { status: 404 });

    const reciboCompany = (reciboRow as any)?.vendas?.company_id;
    if (!scope.isAdmin && reciboCompany !== companyId) {
      return json({ error: 'Recibo fora do escopo da empresa.' }, { status: 403 });
    }

    const vendedorOrigemId = String((reciboRow as any)?.vendas?.vendedor_id || '').trim();
    if (!isUuid(vendedorOrigemId)) {
      return json({ error: 'Venda sem vendedor válido para rateio.' }, { status: 400 });
    }

    if (vendedor_destino_id === vendedorOrigemId) {
      return json({ error: 'O vendedor destino deve ser diferente do vendedor de origem.' }, { status: 400 });
    }

    // Confirma que o produto do recibo soma na meta (produtos diferenciados)
    const { data: reciboProduto } = await client
      .from('vendas_recibos')
      .select(
        'produto_resolvido_id, produtos!produto_resolvido_id(tipo_produto_id, tipo_produtos!tipo_produto_id(soma_na_meta))'
      )
      .eq('id', rawId)
      .maybeSingle();

    const somaNaMeta =
      (reciboProduto as any)?.produtos?.tipo_produtos?.soma_na_meta ?? null;

    // Confirma que o vendedor destino pertence à mesma empresa e está ativo
    const { data: vendedorRow } = await client
      .from('users')
      .select('id, company_id, active')
      .eq('id', vendedor_destino_id)
      .eq('active', true)
      .maybeSingle();

    if (!vendedorRow) return json({ error: 'Vendedor destino não encontrado ou inativo.' }, { status: 404 });
    if (!scope.isAdmin && vendedorRow.company_id !== companyId) {
      return json({ error: 'Vendedor destino fora do escopo da empresa.' }, { status: 403 });
    }

    // Restrição de gestor: só pode ratear vendas da própria equipe
    if (scope.isGestor) {
      const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
      const equipeSet = new Set(equipeIds.map((id) => String(id || '').trim()));
      if (!equipeSet.has(vendedorOrigemId) || !equipeSet.has(vendedor_destino_id)) {
        return json({ error: 'Gestor só pode ratear vendas da própria equipe.' }, { status: 403 });
      }
    }

    const payload = {
      venda_recibo_id: rawId,
      conciliacao_recibo_id: null,
      company_id: reciboCompany ?? companyId,
      vendedor_origem_id: vendedorOrigemId,
      vendedor_destino_id,
      percentual_origem: 100 - pct,
      percentual_destino: pct,
      observacao: String(observacao || '').trim() || null,
      ativo: true,
      updated_by: user.id,
      created_by: user.id
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
