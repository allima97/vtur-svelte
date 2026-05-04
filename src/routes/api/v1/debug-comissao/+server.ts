import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isDebugEndpointEnabled,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { fetchCommissionContext, calcularComissaoRows } from '$lib/server/comissoes';
import {
  fetchEffectiveConciliacaoReceipts,
  buildConciliacaoSyntheticVendas
} from '$lib/conciliacao/source';
import {
  hasConciliacaoCommissionRule,
  hasConciliacaoBandRules,
  resolveConciliacaoBandKey,
  resolveConciliacaoCommissionSelection,
  calcularPctPorRegra,
  regraProdutoTemFixo,
  buildLegacyConciliacaoRule
} from '$lib/utils/comissao';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';

const DEBUG_HEADERS = NO_STORE_HEADERS;

function debugJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  Object.entries(DEBUG_HEADERS).forEach(([key, value]) => headers.set(key, value));
  return json(body, { ...init, headers });
}

export async function GET(event: any) {
  try {
    if (!isDebugEndpointEnabled(event)) {
      return debugJson({ error: 'Not found' }, { status: 404 });
    }

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      return debugJson({ error: 'Sem acesso ao diagnóstico de comissão.' }, { status: 403 });
    }
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Comissionamento', 'financeiro'], 1, 'Sem acesso ao diagnóstico de comissão.');
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('empresa_id'));
    const dataInicio = event.url.searchParams.get('inicio') || '2026-04-01';
    const dataFim = event.url.searchParams.get('fim') || '2026-04-30';

    const concReceipts = await fetchEffectiveConciliacaoReceipts({
      client,
      companyId: companyIds[0] || null,
      companyIds,
      inicio: dataInicio,
      fim: dataFim,
      vendedorIds: null,
      excludeVendedorIds: undefined
    });

    const syntheticVendas = buildConciliacaoSyntheticVendas(concReceipts);
    const syntheticRows = syntheticVendas.map((row: any) => ({
      ...row,
      recibos: Array.isArray(row?.vendas_recibos) ? row.vendas_recibos : []
    }));

    const periodoMeta = dataInicio ? dataInicio.slice(0, 7) + '-01' : '';
    const ctx = await fetchCommissionContext(client, { companyIds, rows: syntheticRows, periodo: periodoMeta });
    const params = ctx.params;

    // Diagnóstico deep para "Passagem Facial"
    const passagemRows = syntheticRows.filter((row: any) =>
      (row.recibos || []).some((r: any) =>
        String(r?.tipo_produtos?.nome || '').toLowerCase().includes('passagem') ||
        String(r?.produto_id || '') === '5ef10eb0-2b54-42bd-bc1e-d3dbb727726e'
      )
    );

    // Calcula comissão via engine completo para estas rows
    const { pctMetaGeral, pctByReceiptId } = calcularComissaoRows(syntheticRows as any, ctx);

    const diag = passagemRows.slice(0, 3).map((row: any) => {
      return (row.recibos || []).filter((r: any) =>
        String(r?.tipo_produtos?.nome || '').toLowerCase().includes('passagem') ||
        String(r?.produto_id || '') === '5ef10eb0-2b54-42bd-bc1e-d3dbb727726e'
      ).map((recibo: any) => {
        const productId = String(recibo?.tipo_produtos?.id || recibo?.produto_id || '');
        const produtoRegraBase = productId ? ctx.regraProdutoMap[productId] || null : null;
        const selectedRuleHasFixed = Boolean(produtoRegraBase && regraProdutoTemFixo(produtoRegraBase));
        const hcOverride =
          recibo?.valor_bruto_override != null ||
          recibo?.valor_liquido_override != null ||
          recibo?.valor_meta_override != null;
        const hcCommRule = hasConciliacaoCommissionRule(params);
        const hcBandRules = hasConciliacaoBandRules(params);
        const legacyRule = buildLegacyConciliacaoRule(params);
        const shouldApply = hcOverride && hcCommRule;

        const bandKey = resolveConciliacaoBandKey({
          conciliacao_faixas_loja: params?.conciliacao_faixas_loja ?? null,
          faixa_comissao: recibo?.faixa_comissao ?? null,
          percentual_comissao_loja: recibo?.percentual_comissao_loja != null ? Number(recibo.percentual_comissao_loja) : null,
          is_seguro_viagem: recibo?.is_seguro_viagem ?? null
        });

        const selection = resolveConciliacaoCommissionSelection(params, {
          faixa_comissao: recibo?.faixa_comissao ?? null,
          percentual_comissao_loja: recibo?.percentual_comissao_loja != null ? Number(recibo.percentual_comissao_loja) : null,
          is_seguro_viagem: recibo?.is_seguro_viagem ?? null
        });

        const pctCalculado = selection.kind === 'CONCILIACAO' && selection.rule
          ? calcularPctPorRegra(selection.rule, pctMetaGeral)
          : null;

        const pctEngineCalculado = recibo?.id ? pctByReceiptId.get(String(recibo.id)) ?? null : null;

        return {
          produto: recibo?.tipo_produtos?.nome,
          product_id: productId,
          percentual_comissao_loja: recibo?.percentual_comissao_loja,
          faixa_comissao: recibo?.faixa_comissao,
          valor_bruto_override: recibo?.valor_bruto_override,
          valor_liquido_override: recibo?.valor_liquido_override,
          hcOverride,
          hcCommRule,
          hcBandRules,
          hasLegacyRule: Boolean(legacyRule),
          selectedRuleHasFixed,
          produtoRegraBase,
          shouldApply,
          bandKey,
          selection_kind: selection.kind,
          selection_rule: selection.rule,
          pctMetaGeral,
          pctCalculado,
          pctEngineCalculado,
          params_conciliacao_regra_ativa: params?.conciliacao_regra_ativa,
          params_faixas_count: params?.conciliacao_faixas_loja?.length
        };
      });
    });

    return debugJson({ diag, params_summary: {
      conciliacao_regra_ativa: params?.conciliacao_regra_ativa,
      conciliacao_tipo: params?.conciliacao_tipo,
      faixas: params?.conciliacao_faixas_loja?.map((f: any) => ({ faixa_loja: f.faixa_loja, ativo: f.ativo, tipo_calculo: f.tipo_calculo, meta_nao_atingida: f.meta_nao_atingida, percentual_min: f.percentual_min, percentual_max: f.percentual_max }))
    }, pctMetaGeral });
  } catch (e: any) {
    const response = toErrorResponse(e, 'Erro no diagnóstico de comissão.');
    response.headers.set('Cache-Control', DEBUG_HEADERS['Cache-Control']);
    return response;
  }
}
