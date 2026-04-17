import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveUserScope } from '$lib/server/v1';

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['dashboard'], 1, 'Sem acesso ao Dashboard.');
    }

    const companyId = String(event.url.searchParams.get('company_id') || '').trim();
    const inicio = String(event.url.searchParams.get('inicio') || '2026-04-01').trim();
    const fim = String(event.url.searchParams.get('fim') || '2026-04-08').trim();

    if (!companyId) {
      return json({ error: 'company_id required' }, { status: 400 });
    }

    const vendedorId = String(event.url.searchParams.get('vendedor_id') || '').trim();

    let vendasQuery = client
      .from('vendas')
      .select(
        `id, vendedor_id, status, data_venda, valor_total, valor_total_bruto,
        vendas_recibos(id, numero_recibo, data_venda, valor_total, cancelado_por_conciliacao_em)`
      )
      .eq('company_id', companyId)
      .eq('cancelada', false)
      .gte('data_venda', inicio)
      .lte('data_venda', fim);

    if (vendedorId) {
      vendasQuery = vendasQuery.eq('vendedor_id', vendedorId);
    }

    const { data: vendasBase, error: vendasErr } = await vendasQuery;
    if (vendasErr) throw vendasErr;

    let totalVendas = 0;
    let vendasCanceladasStatus = 0;
    let recibosCanceladosMesmoMes = 0;
    const vendaIds: string[] = [];

    (vendasBase || []).forEach((v: any) => {
      const vid = String(v.id || '').trim();
      if (vid) vendaIds.push(vid);

      if (String(v.status || '').trim().toLowerCase() === 'cancelado') {
        vendasCanceladasStatus += toNumber(v.valor_total_bruto);
        return;
      }

      const recibos = Array.isArray(v.vendas_recibos) ? v.vendas_recibos : [];
      let vendaTotal = toNumber(v.valor_total_bruto);

      recibos.forEach((r: any) => {
        if (r.cancelado_por_conciliacao_em) {
          const reciboMes = String(r.data_venda || '').slice(0, 7);
          const cancelMes = String(r.cancelado_por_conciliacao_em).slice(0, 7);
          if (reciboMes === cancelMes) {
            recibosCanceladosMesmoMes += toNumber(r.valor_total);
            vendaTotal -= toNumber(r.valor_total);
          }
        }
      });

      totalVendas += vendaTotal;
    });

    const { data: concRecords, error: concErr } = await client
      .from('conciliacao_recibos')
      .select(
        `id, documento, descricao, status, valor_lancamentos, valor_venda_real, 
        valor_nao_comissionavel, venda_id, venda_recibo_id, movimento_data`
      )
      .eq('company_id', companyId)
      .neq('is_baixa_rac', true)
      .gte('movimento_data', inicio)
      .lte('movimento_data', fim)
      .order('movimento_data', { ascending: true });

    if (concErr) throw concErr;

    let concBaixa = 0;
    let concOpfax = 0;
    let concOther = 0;
    let concLinked = 0;

    const relevantDocs = new Set<string>();

    (concRecords || []).forEach((row: any) => {
      const status = String(row.status || '').toUpperCase();
      const temValor = toNumber(row.valor_lancamentos) > 0 || toNumber(row.valor_venda_real) > 0;

      if (status === 'BAIXA') {
        concBaixa += toNumber(row.valor_venda_real || row.valor_lancamentos);
        relevantDocs.add(String(row.documento || ''));
      } else if (status === 'OPFAX') {
        concOpfax += toNumber(row.valor_venda_real || row.valor_lancamentos);
        if (temValor) relevantDocs.add(String(row.documento || ''));
      } else if (temValor) {
        concOther += toNumber(row.valor_venda_real || row.valor_lancamentos);
        relevantDocs.add(String(row.documento || ''));
      }

      if (row.venda_id) {
        concLinked += 1;
      }
    });

    return json({
      period: { inicio, fim },
      vendas_base: {
        total_bruto: totalVendas,
        canceladas_status: vendasCanceladasStatus,
        recibos_cancelados_mesmo_mes: recibosCanceladosMesmoMes,
        count_sales: (vendasBase || []).length,
        count_vendas_id: vendaIds.length
      },
      conciliacao: {
        count_total: (concRecords || []).length,
        count_baixa: concRecords?.filter((r: any) => String(r.status || '').toUpperCase() === 'BAIXA').length,
        count_opfax: concRecords?.filter((r: any) => String(r.status || '').toUpperCase() === 'OPFAX').length,
        count_other_status:
          (concRecords || []).length -
          (concRecords?.filter(
            (r: any) =>
              String(r.status || '').toUpperCase() === 'BAIXA' ||
              String(r.status || '').toUpperCase() === 'OPFAX'
          ).length || 0),
        count_null_status: concRecords?.filter((r: any) => !r.status || String(r.status || '').trim() === '').length,
        total_baixa: concBaixa,
        total_opfax: concOpfax,
        total_other_with_valor: concOther,
        count_linked_to_venda: concLinked,
        count_relevant_docs: relevantDocs.size
      },
      raw_conciliacao_sample: (concRecords || []).slice(0, 5)
    });
  } catch (error) {
    console.error('[dashboard/debug-aggregates]', error);
    return json({ error: String(error) }, { status: 500 });
  }
}
