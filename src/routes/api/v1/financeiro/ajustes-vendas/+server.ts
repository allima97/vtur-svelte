import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchRankingVendedoresByCompanyIds,
  getAdminClient,
  isUuid,
  logServerError,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  sanitizePostgrestSearchTerm,
  toErrorResponse
} from '$lib/server/v1';
import { NO_STORE_HEADERS, SHORT_DYNAMIC_READ_HEADERS } from '$lib/server/httpCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import { invalidateReadModelCache, READ_MODEL_TAGS } from '$lib/server/readModelCache';
import {
  cleanStringSet,
  chunkArray,
  dedupeById,
  SUPABASE_IN_BATCH_SIZE,
  uniqueCleanStrings
} from '$lib/utils/array';

const MAX_AJUSTES_VENDAS_BODY_BYTES = 32 * 1024;

function invalidateAjustesVendasReadModels() {
  invalidateReadModelCache({
    tags: [
      READ_MODEL_TAGS.sales,
      READ_MODEL_TAGS.conciliacao,
      READ_MODEL_TAGS.finance,
      READ_MODEL_TAGS.dashboard,
      READ_MODEL_TAGS.vendasKpis,
      READ_MODEL_TAGS.ranking,
      READ_MODEL_TAGS.comissoes
    ]
  });
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ['operacao_conciliacao', 'conciliacao'],
        1,
        'Sem acesso a Ajustes de Vendas.'
      );
    }

    const requestedCompanyId = String(event.url.searchParams.get('company_id') || '').trim();
    const companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
    if (companyIds.length === 0 && !scope.isAdmin) {
      return json({ items: [], vendedores: [] }, { headers: SHORT_DYNAMIC_READ_HEADERS });
    }

    const { searchParams } = event.url;
    const inicio = String(searchParams.get('inicio') || '').trim();
    const fim = String(searchParams.get('fim') || '').trim();
    const vendedorId = String(searchParams.get('vendedor_id') || '').trim();
    const qRaw = sanitizePostgrestSearchTerm(searchParams.get('q'));
    const q = qRaw.length >= 2 ? qRaw : '';
    const limit = 120;

    const buildQuery = (companyIdsFilter = companyIds) => {
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
        .eq('vendas.cancelada', false)
        .order('data_venda', { ascending: false })
        .limit(limit);

      if (companyIdsFilter.length === 1) {
        query = query.eq('vendas.company_id', companyIdsFilter[0]);
      } else if (companyIdsFilter.length > 1) {
        query = query.in('vendas.company_id', companyIdsFilter);
      }
      if (inicio) query = query.gte('data_venda', inicio);
      if (fim) query = query.lte('data_venda', fim);
      if (vendedorId && isUuid(vendedorId)) {
        query = query.eq('vendas.vendedor_id', vendedorId);
      }
      if (q) query = (query as any).or(`numero_recibo.ilike.%${q}%`);

      return query;
    };

    const fetchRows = async () => {
      if (companyIds.length <= SUPABASE_IN_BATCH_SIZE) {
        return buildQuery();
      }

      const rows: any[] = [];
      for (const batch of chunkArray(companyIds)) {
        const result = await buildQuery(batch);
        if (result.error) return { data: null, error: result.error } as typeof result;
        rows.push(...(result.data || []));
      }

      return {
        data: dedupeById(rows)
          .sort((a, b) => String(b?.data_venda || '').localeCompare(String(a?.data_venda || '')))
          .slice(0, limit),
        error: null
      };
    };

    const { data, error: queryError } = await fetchRows();
    if (queryError) throw queryError;

    const reciboIds: string[] = [];
    for (const row of data || []) {
      const id = String(row.id);
      if (id) reciboIds.push(id);
    }

    // Busca rateios separadamente (evita joins problemáticos)
    let rateioMap = new Map<string, any>();
    if (reciboIds.length > 0) {
      for (const batch of chunkArray(reciboIds)) {
        const { data: rateioData, error: rateioError } = await client
          .from('vendas_recibos_rateio')
          .select(`
            id, venda_recibo_id, ativo,
            vendedor_destino_id, percentual_origem, percentual_destino, observacao, updated_at,
            vendedor_destino:users!vendedor_destino_id(id, nome_completo)
          `)
          .in('venda_recibo_id', batch);

        if (rateioError && !String(rateioError.code || '').includes('42P01')) throw rateioError;
        for (const r of rateioData || []) {
          if (r.venda_recibo_id) rateioMap.set(r.venda_recibo_id, r);
        }
      }
    }

    // Busca nomes dos vendedores
    const vendedorIdsFromRows = uniqueCleanStrings((data || []).map((r: any) => r.vendas?.vendedor_id));
    const vendedorNomeMap = new Map<string, string>();
    if (vendedorIdsFromRows.length > 0) {
      for (const batch of chunkArray(vendedorIdsFromRows)) {
        const { data: vData } = await client.from('users').select('id, nome_completo').in('id', batch);
        for (const v of vData || []) {
          vendedorNomeMap.set(v.id, v.nome_completo);
        }
      }
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
    const vendedoresData = await fetchRankingVendedoresByCompanyIds(client, companyIds);

    return json(
      { items, vendedores: (vendedoresData || []).map((v: any) => ({ id: v.id, nome_completo: v.nome_completo })) },
      { headers: SHORT_DYNAMIC_READ_HEADERS }
    );
  } catch (err: any) {
    logServerError('[ajustes-vendas] falha ao carregar ajustes', err);
    return toErrorResponse(err, 'Erro ao carregar ajustes de vendas.');
  }
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_AJUSTES_VENDAS_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

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

    if (!scope.isAdmin && !scope.isMaster && !scope.isFinanceiro && !scope.isGestor) {
      return json(
        { error: 'Somente financeiro/gestor/master podem editar Ajustes de Vendas.' },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const { ajuste_id, vendedor_destino_id, percentual_destino, observacao } = body;

    const ajusteIdRaw = String(ajuste_id || '').trim();
    const isConciliacao = ajusteIdRaw.startsWith('cr:');
    const isVendaRecibo = ajusteIdRaw.startsWith('vr:');
    const rawId = ajusteIdRaw.replace(/^vr:/, '').replace(/^cr:/, '').trim();

    if (!isUuid(rawId)) return json({ error: 'ID do recibo inválido.' }, { status: 400, headers: NO_STORE_HEADERS });

    const pct = Number(percentual_destino);
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) {
      return json({ error: 'Percentual deve ser >= 0 e < 100.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    // Busca o recibo na tabela correta (vendas_recibos ou conciliacao_recibos)
    let reciboCompany: string | null = null;
    let vendedorOrigemId = '';
    let conciliacaoReciboId: string | null = null;
    let vendaReciboId: string | null = null;

    if (isConciliacao) {
      const { data: concRow, error: concErr } = await client
        .from('conciliacao_recibos')
        .select('id, company_id, ranking_vendedor_id')
        .eq('id', rawId)
        .maybeSingle();
      if (concErr) throw concErr;
      if (!concRow) return json({ error: 'Recibo de conciliação não encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });
      reciboCompany = String((concRow as any)?.company_id || '');
      vendedorOrigemId = String((concRow as any)?.ranking_vendedor_id || '').trim();
      conciliacaoReciboId = rawId;
    } else {
      const { data: reciboRow, error: reciboErr } = await client
        .from('vendas_recibos')
        .select('id, vendas!inner(company_id, vendedor_id, cancelada)')
        .eq('id', rawId)
        .eq('vendas.cancelada', false)
        .maybeSingle();
      if (reciboErr) throw reciboErr;
      if (!reciboRow) return json({ error: 'Recibo não encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });
      reciboCompany = (reciboRow as any)?.vendas?.company_id;
      vendedorOrigemId = String((reciboRow as any)?.vendas?.vendedor_id || '').trim();
      vendaReciboId = rawId;
    }

    if (!scope.isAdmin && !scope.companyIds.includes(String(reciboCompany || ''))) {
      return json({ error: 'Recibo fora do escopo da empresa.' }, { status: 403, headers: NO_STORE_HEADERS });
    }
    if (!isUuid(String(reciboCompany || ''))) {
      return json({ error: 'Recibo sem empresa válida para rateio.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (!isUuid(vendedorOrigemId)) {
      return json({ error: 'Recibo sem vendedor válido para rateio.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (pct === 0) {
      let clearQuery = client
        .from('vendas_recibos_rateio')
        .update({
          ativo: false,
          percentual_origem: 100,
          percentual_destino: 0,
          observacao: String(observacao || '').trim() || null,
          updated_by: user.id
        });

      clearQuery = vendaReciboId
        ? clearQuery.eq('venda_recibo_id', vendaReciboId)
        : clearQuery.eq('conciliacao_recibo_id', conciliacaoReciboId);

      if (reciboCompany) clearQuery = clearQuery.eq('company_id', reciboCompany);

      const { error: clearError } = await clearQuery;
      if (clearError) throw clearError;

      invalidateAjustesVendasReadModels();
      return json({ ok: true, cleared: true }, { headers: NO_STORE_HEADERS });
    }

    if (!isUuid(vendedor_destino_id)) {
      return json({ error: 'Vendedor destino inválido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (vendedor_destino_id === vendedorOrigemId) {
      return json({ error: 'O vendedor destino deve ser diferente do vendedor de origem.' }, { status: 400, headers: NO_STORE_HEADERS });
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

    if (!vendedorRow) return json({ error: 'Vendedor destino não encontrado ou inativo.' }, { status: 404, headers: NO_STORE_HEADERS });
    if (!scope.isAdmin && vendedorRow.company_id !== reciboCompany) {
      return json({ error: 'Vendedor destino fora do escopo da empresa.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    // Restrição de gestor: só pode ratear vendas da própria equipe
    if (scope.isGestor) {
      const gestorCompanyIds = reciboCompany ? [reciboCompany] : scope.companyIds;
      const equipeIds = uniqueCleanStrings(
        (await fetchRankingVendedoresByCompanyIds(client, gestorCompanyIds)).map(
          (row: any) => row?.id
        )
      );
      const equipeSet = cleanStringSet(equipeIds);
      if (!equipeSet.has(vendedorOrigemId) || !equipeSet.has(vendedor_destino_id)) {
        return json({ error: 'Gestor só pode ratear vendas da própria empresa.' }, { status: 403, headers: NO_STORE_HEADERS });
      }
    }

    const payload = {
      venda_recibo_id: vendaReciboId,
      conciliacao_recibo_id: conciliacaoReciboId,
      company_id: reciboCompany,
      vendedor_origem_id: vendedorOrigemId,
      vendedor_destino_id,
      percentual_origem: 100 - pct,
      percentual_destino: pct,
      observacao: String(observacao || '').trim() || null,
      ativo: true,
      updated_by: user.id,
      created_by: user.id
    };

    let existingQuery = client.from('vendas_recibos_rateio').select('id');
    if (vendaReciboId) {
      existingQuery = existingQuery.eq('venda_recibo_id', vendaReciboId);
    } else if (conciliacaoReciboId) {
      existingQuery = existingQuery.eq('conciliacao_recibo_id', conciliacaoReciboId);
    }
    const { data: existing } = await existingQuery.maybeSingle();

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

    invalidateAjustesVendasReadModels();
    return json({ ok: true, soma_na_meta: somaNaMeta }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar ajuste de venda.');
  }
}
