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

/**
 * GET /api/v1/conciliacao/rateio-info?venda_recibo_id=<uuid>&company_id=<uuid>
 *
 * Retorna, para um venda_recibo_id, as informações de rateio e se o produto
 * soma na meta — usado pelo front durante o assign para exibir a divisão
 * de ranking entre vendedor origem e vendedor destino.
 *
 * Resposta:
 * {
 *   venda_recibo_id: string
 *   soma_na_meta: boolean | null        // null = produto não encontrado
 *   produto_nome: string | null
 *   produto_tipo_nome: string | null
 *   vendedor_origem: { id, nome } | null
 *   rateio: {
 *     id: string
 *     ativo: boolean
 *     vendedor_destino_id: string
 *     vendedor_destino_nome: string
 *     percentual_origem: number         // % do ranking para o vendedor da venda
 *     percentual_destino: number        // % do ranking para o vendedor destino
 *     valor_origem: number              // valor_calculada_loja * pct_origem / 100
 *     valor_destino: number             // valor_calculada_loja * pct_destino / 100
 *   } | null
 *   valor_calculada_loja: number | null // vindo de conciliacao_recibos se passado
 * }
 */
export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 1, 'Sem acesso à Conciliação.');
    }

    const { searchParams } = event.url;
    const vendaReciboId = String(searchParams.get('venda_recibo_id') || '').trim();
    const conciliacaoReciboId = String(searchParams.get('conciliacao_recibo_id') || '').trim();

    if (!isUuid(vendaReciboId)) {
      return json({ error: 'venda_recibo_id inválido.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('company_id'));

    // 1. Busca o recibo com produto e vendedor de origem
    const { data: reciboData, error: reciboErr } = await client
      .from('vendas_recibos')
      .select(`
        id,
        valor_total,
        vendas!inner(
          company_id,
          vendedor_id,
          vendedor:users!vendedor_id(id, nome_completo)
        ),
        produto_resolvido:produtos!produto_resolvido_id(
          id, nome,
          tipo_produto:tipo_produtos!tipo_produto_id(id, nome, soma_na_meta)
        ),
        rateio:vendas_recibos_rateio(
          id, ativo,
          vendedor_destino_id, percentual_origem, percentual_destino,
          vendedor_destino:users!vendedor_destino_id(id, nome_completo)
        )
      `)
      .eq('id', vendaReciboId)
      .maybeSingle();

    if (reciboErr) throw reciboErr;
    if (!reciboData) return json({ error: 'Recibo não encontrado.' }, { status: 404 });

    // Ownership check
    const reciboCompany = (reciboData as any)?.vendas?.company_id;
    if (!scope.isAdmin && companyIds.length > 0 && !companyIds.includes(reciboCompany)) {
      return json({ error: 'Recibo fora do escopo.' }, { status: 403 });
    }

    const recibo = reciboData as any;
    const tipoProduto = recibo.produto_resolvido?.tipo_produto;
    const somaNaMeta: boolean | null = tipoProduto?.soma_na_meta ?? null;

    const vendedorOrigem = recibo.vendas?.vendedor
      ? { id: recibo.vendas.vendedor.id, nome: recibo.vendas.vendedor.nome_completo }
      : null;

    // 2. Rateio ativo
    const rateioRow = Array.isArray(recibo.rateio)
      ? recibo.rateio.find((r: any) => r.ativo !== false) ?? recibo.rateio[0] ?? null
      : recibo.rateio ?? null;

    // 3. Valor de referência — tenta buscar em conciliacao_recibos se passado
    let valorCalculadaLoja: number | null = null;
    if (isUuid(conciliacaoReciboId)) {
      const { data: concRow } = await client
        .from('conciliacao_recibos')
        .select('valor_calculada_loja, valor_lancamentos')
        .eq('id', conciliacaoReciboId)
        .maybeSingle();
      if (concRow) {
        valorCalculadaLoja =
          Number(concRow.valor_calculada_loja ?? concRow.valor_lancamentos ?? 0) || null;
      }
    }

    if (!valorCalculadaLoja) {
      valorCalculadaLoja = Number(recibo.valor_total || 0) || null;
    }

    let rateioInfo: Record<string, any> | null = null;
    if (rateioRow && rateioRow.ativo !== false) {
      const pctOrigem = Number(rateioRow.percentual_origem ?? 100);
      const pctDestino = Number(rateioRow.percentual_destino ?? 0);
      const base = valorCalculadaLoja ?? 0;

      rateioInfo = {
        id: rateioRow.id,
        ativo: rateioRow.ativo,
        vendedor_destino_id: rateioRow.vendedor_destino_id,
        vendedor_destino_nome:
          rateioRow.vendedor_destino?.nome_completo ?? rateioRow.vendedor_destino_id,
        percentual_origem: pctOrigem,
        percentual_destino: pctDestino,
        valor_origem: Math.round((base * pctOrigem) / 100 * 100) / 100,
        valor_destino: Math.round((base * pctDestino) / 100 * 100) / 100
      };
    }

    return json({
      venda_recibo_id: vendaReciboId,
      soma_na_meta: somaNaMeta,
      produto_nome: recibo.produto_resolvido?.nome ?? null,
      produto_tipo_nome: tipoProduto?.nome ?? null,
      vendedor_origem: vendedorOrigem,
      rateio: rateioInfo,
      valor_calculada_loja: valorCalculadaLoja
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar informações de rateio.');
  }
}
