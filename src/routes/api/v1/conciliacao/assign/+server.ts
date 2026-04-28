import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { buildConciliacaoMetrics } from '$lib/conciliacao/business';

function parseNullableNumber(value: any) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 3, 'Sem permissão para atribuir conciliação.');
    }

    const body = await event.request.json();
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId);
    const companyId = companyIds[0] || scope.companyId;

    const conciliacaoId = String(body?.conciliacaoId || '').trim();
    if (!isUuid(conciliacaoId)) return json({ error: 'ID de conciliação inválido.' }, { status: 400 });

    const rankingVendedorId = String(body?.rankingVendedorId || '').trim() || null;
    const rankingProdutoId = String(body?.rankingProdutoId || '').trim() || null;
    const vendaId = String(body?.vendaId || '').trim() || null;
    const vendaReciboId = String(body?.vendaReciboId || '').trim() || null;
    const isBaixaRac = Boolean(body?.isBaixaRac);

    const valorLancamentos = parseNullableNumber(body?.valorLancamentos);
    const valorTaxas = parseNullableNumber(body?.valorTaxas);
    const valorDescontos = parseNullableNumber(body?.valorDescontos);
    const valorAbatimentos = parseNullableNumber(body?.valorAbatimentos);
    const valorNaoComissionavel = parseNullableNumber(body?.valorNaoComissionavel);
    const valorCalculadaLoja = parseNullableNumber(body?.valorCalculadaLoja);
    const valorVisaoMaster = parseNullableNumber(body?.valorVisaoMaster);
    const valorOpfax = parseNullableNumber(body?.valorOpfax);
    const valorSaldo = parseNullableNumber(body?.valorSaldo);
    const valorComissaoLoja = parseNullableNumber(body?.valorComissaoLoja);

    if (
      Number.isNaN(valorLancamentos) ||
      Number.isNaN(valorTaxas) ||
      Number.isNaN(valorDescontos) ||
      Number.isNaN(valorAbatimentos) ||
      Number.isNaN(valorNaoComissionavel) ||
      Number.isNaN(valorCalculadaLoja) ||
      Number.isNaN(valorVisaoMaster) ||
      Number.isNaN(valorOpfax) ||
      Number.isNaN(valorSaldo) ||
      Number.isNaN(valorComissaoLoja)
    ) {
      return json({ error: 'Um ou mais campos de valor estão inválidos.' }, { status: 400 });
    }

    // Verifica se o registro pertence à empresa
    const { data: registro, error: registroErr } = await client
      .from('conciliacao_recibos')
      .select('id, company_id, descricao')
      .eq('id', conciliacaoId)
      .maybeSingle();

    if (registroErr) throw registroErr;
    if (!registro) return json({ error: 'Registro não encontrado.' }, { status: 404 });
    if (!scope.isAdmin && registro.company_id !== companyId) {
      return json({ error: 'Registro fora do escopo.' }, { status: 403 });
    }

    const update: Record<string, any> = {
      ranking_assigned_at: new Date().toISOString()
    };

    if (rankingVendedorId !== undefined) update.ranking_vendedor_id = rankingVendedorId;
    if (rankingProdutoId !== undefined) update.ranking_produto_id = rankingProdutoId;
    if (vendaId !== undefined) update.venda_id = vendaId;
    if (vendaReciboId !== undefined) update.venda_recibo_id = vendaReciboId;
    if (body && 'isBaixaRac' in body) update.is_baixa_rac = isBaixaRac;
    if (body && 'conciliado' in body) update.conciliado = Boolean(body.conciliado);

    const payloadTemValores = [
      'valorLancamentos',
      'valorTaxas',
      'valorDescontos',
      'valorAbatimentos',
      'valorNaoComissionavel',
      'valorCalculadaLoja',
      'valorVisaoMaster',
      'valorOpfax',
      'valorSaldo',
      'valorComissaoLoja'
    ].some((field) => body && field in body);

    if (payloadTemValores) {
      const metrics = buildConciliacaoMetrics({
        descricao: registro?.descricao,
        valorLancamentos,
        valorTaxas,
        valorDescontos,
        valorAbatimentos,
        valorNaoComissionavel,
        valorCalculadaLoja,
        valorVisaoMaster,
        valorOpfax,
        valorSaldo,
        valorComissaoLoja
      });

      update.valor_lancamentos = valorLancamentos;
      update.valor_taxas = valorTaxas;
      update.valor_descontos = valorDescontos;
      update.valor_abatimentos = valorAbatimentos;
      update.valor_nao_comissionavel = valorNaoComissionavel;
      update.valor_calculada_loja = valorCalculadaLoja;
      update.valor_visao_master = valorVisaoMaster;
      update.valor_opfax = valorOpfax;
      update.valor_saldo = valorSaldo;
      update.valor_venda_real = metrics.valorVendaReal;
      update.valor_comissao_loja = metrics.valorComissaoLoja;
      update.percentual_comissao_loja = metrics.percentualComissaoLoja;
      update.faixa_comissao = metrics.faixaComissao;
      update.is_seguro_viagem = metrics.isSeguroViagem;
      update.descricao_chave = metrics.descricaoChave || null;
    }

    const { error: updateError } = await client
      .from('conciliacao_recibos')
      .update(update)
      .eq('id', conciliacaoId);

    if (updateError) throw updateError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atribuir conciliação.');
  }
}
