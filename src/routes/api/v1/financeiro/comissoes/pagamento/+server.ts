import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { resolveGroupedReceiptCommissions, type ResolvedReceiptCommission } from '$lib/server/comissoes';
import {
  buildPersistedReciboComissaoKey,
  fetchPersistedComissoes,
  persistPaidReceiptComissoes,
  type PersistReceiptPaymentRow
} from '$lib/server/comissoes-registro';
import { fetchSalesReportRows } from '$lib/server/relatorios';
import { todayISODateLocal } from '$lib/date';

function toNum(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getReciboValor(recibo: any) {
  return Math.max(0, toNum(recibo?.valor_total) - toNum(recibo?.valor_rav));
}

function filterRowsToReceiptIds(rows: any[], receiptIds: Set<string>) {
  return (rows || [])
    .map((row) => ({
      ...row,
      recibos: (Array.isArray(row?.recibos) ? row.recibos : []).filter((recibo: any) =>
        receiptIds.has(String(recibo?.id || '').trim())
      )
    }))
    .filter((row) => Array.isArray(row.recibos) && row.recibos.length > 0);
}

function normalizeRowsToReceiptPeriod(rows: any[]) {
  return (rows || []).map((row) => {
    const recibos = Array.isArray(row?.recibos) ? row.recibos : [];
    const firstReceiptDate = recibos.find((recibo: any) => recibo?.data_venda)?.data_venda;
    return firstReceiptDate ? { ...row, data_venda: firstReceiptDate } : row;
  });
}

function canManageCommissionPayments(scope: Awaited<ReturnType<typeof resolveUserScope>>) {
  return scope.isAdmin || scope.isMaster || scope.isGestor;
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Comissionamento', 'financeiro'], 3, 'Sem permissão para registrar pagamentos.');
    }
    if (!canManageCommissionPayments(scope)) {
      return json({ error: 'Vendedores não podem registrar pagamentos de comissões.' }, { status: 403 });
    }

    const body = await event.request.json();
    const { comissao_ids, data_pagamento = todayISODateLocal(), observacoes = '' } = body;

    if (!comissao_ids || !Array.isArray(comissao_ids) || comissao_ids.length === 0) {
      return json({ error: 'IDs das comissões são obrigatórios.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, body?.empresa_id || body?.company_id);
    const reciboIds = comissao_ids.map((id: unknown) => String(id || '').trim()).filter(Boolean);
    const reciboIdSet = new Set(reciboIds);

    const { data: recibosBase, error: recibosBaseError } = await client
      .from('vendas_recibos')
      .select('id, venda_id')
      .in('id', reciboIds);
    if (recibosBaseError) throw recibosBaseError;

    const vendaIds = Array.from(
      new Set((recibosBase || []).map((row: any) => String(row?.venda_id || '').trim()).filter(Boolean))
    );

    const fetchedRows = await fetchSalesReportRows(client, {
      companyIds,
      vendaIds
    });
    const rows = filterRowsToReceiptIds(fetchedRows, reciboIdSet);

    if (rows.length === 0) {
      return json({ error: 'Nenhum recibo elegível encontrado para registrar comissão.' }, { status: 404 });
    }

    const vendedoresSelecionados = Array.from(
      new Set(rows.map((row) => String(row.vendedor_id || '').trim()).filter(Boolean))
    );
    const periodos = rows
      .flatMap((row) => (Array.isArray(row.recibos) ? row.recibos : []))
      .map((recibo: any) => String(recibo?.data_venda || '').trim())
      .filter((data) => /^\d{4}-\d{2}/.test(data))
      .map((data) => data.slice(0, 7))
      .sort();
    const dataInicioContexto = periodos.length > 0 ? `${periodos[0]}-01` : undefined;
    const dataFimContexto =
      periodos.length > 0
        ? new Date(Number(periodos[periodos.length - 1].slice(0, 4)), Number(periodos[periodos.length - 1].slice(5, 7)), 0)
            .toISOString()
            .slice(0, 10)
        : undefined;
    const contextRows =
      dataInicioContexto && dataFimContexto
        ? await fetchSalesReportRows(client, {
            companyIds,
            vendedorIds: vendedoresSelecionados,
            dataInicio: dataInicioContexto,
            dataFim: dataFimContexto,
            filterByReceiptDate: true
          })
        : rows;
    const contextRowsForComissao = normalizeRowsToReceiptPeriod(contextRows);
    const selectedRowsForComissao = normalizeRowsToReceiptPeriod(rows);
    const resolvedByReceiptId = await resolveGroupedReceiptCommissions(client, {
      companyIds,
      rows: contextRowsForComissao
    });

    const paymentRows: PersistReceiptPaymentRow[] = selectedRowsForComissao.flatMap((row: any) =>
      (Array.isArray(row?.recibos) ? row.recibos : []).map((recibo: any) => ({
        venda_id: row.id,
        recibo_id: String(recibo?.id || '').trim(),
        vendedor_id: row.vendedor_id,
        company_id: row.company_id,
        data_venda: recibo?.data_venda || row.data_venda,
        valor_recibo: getReciboValor(recibo)
      }))
    ).filter((row) => row.recibo_id);

    const resolvedByKey = new Map(
      paymentRows
        .map((row) => {
          const resolved = resolvedByReceiptId.get(row.recibo_id);
          return resolved
            ? ([buildPersistedReciboComissaoKey(row.recibo_id, row.vendedor_id, row.venda_id), resolved] as const)
            : null;
        })
        .filter((entry): entry is readonly [string, ResolvedReceiptCommission] => Boolean(entry))
    );
    const existingSnapshot = await fetchPersistedComissoes(client, {
      companyIds,
      vendaIds,
      reciboIds,
      vendedorIds: paymentRows.map((row) => String(row.vendedor_id || '')).filter(Boolean)
    });

    if (!existingSnapshot.available) {
      return json({
        success: false,
        fallback: true,
        pagas: 0,
        data_pagamento,
        message: 'Persistência de comissão indisponível neste ambiente. Nenhuma baixa foi salva.'
      });
    }

    const existingByKey = new Map(
      existingSnapshot.rows.map((row) => [
        buildPersistedReciboComissaoKey(row.recibo_id, row.vendedor_id, row.venda_id),
        row
      ] as const)
    );

    const result = await persistPaidReceiptComissoes({
      client,
      userId: user.id,
      rows: paymentRows,
      resolvedByKey,
      existingByKey,
      dataPagamento: data_pagamento,
      observacoesPagamento: observacoes
    });

    if ((result as { fallback?: boolean }).fallback) {
      return json({
        success: false,
        fallback: true,
        pagas: 0,
        data_pagamento,
        message: 'Persistência de comissão indisponível neste ambiente. Nenhuma baixa foi salva.'
      });
    }

    return json({
      success: true,
      message: `${result.pagas} comissão(ões) marcada(s) como paga(s)`,
      pagas: result.pagas,
      data_pagamento,
      fallback: false
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao registrar pagamento.');
  }
}

export async function PUT(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Comissionamento', 'financeiro'], 3, 'Sem permissão para atualizar pagamentos.');
    }
    if (!canManageCommissionPayments(scope)) {
      return json({ error: 'Vendedores não podem atualizar pagamentos de comissões.' }, { status: 403 });
    }

    const body = await event.request.json();
    const { comissao_ids, data_pagamento = null, observacoes = '' } = body;

    if (!Array.isArray(comissao_ids) || comissao_ids.length === 0) {
      return json({ error: 'IDs das comissões são obrigatórios.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, body?.empresa_id || body?.company_id);
    let query = client
      .from('comissoes')
      .update({
        data_pagamento,
        observacoes_pagamento: observacoes || null
      })
      .in('recibo_id', comissao_ids.map((id: unknown) => String(id || '').trim()).filter(Boolean))
      .eq('status', 'PAGA')
      .select('id');

    if (companyIds.length > 0) {
      query = query.in('company_id', companyIds);
    }

    const { data, error } = await query;
    if (error) {
      const code = String((error as { code?: string })?.code || '');
      const message = String((error as { message?: string })?.message || '').toLowerCase();
      if (code === '42P01' || code === '42703' || message.includes('does not exist')) {
        return json({ success: true, message: 'Persistência de comissão não disponível neste ambiente.', fallback: true });
      }
      throw error;
    }

    return json({
      success: true,
      message: `${(data || []).length} comissão(ões) atualizada(s).`,
      atualizadas: (data || []).length
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar pagamento.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Comissionamento', 'financeiro'], 4, 'Sem permissão para cancelar comissão.');
    }
    if (!canManageCommissionPayments(scope)) {
      return json({ error: 'Vendedores não podem cancelar comissões.' }, { status: 403 });
    }

    const body = await event.request.json().catch(() => ({}));
    const { comissao_ids, observacoes = '' } = body;

    if (!Array.isArray(comissao_ids) || comissao_ids.length === 0) {
      return json({ error: 'IDs das comissões são obrigatórios.' }, { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(scope, body?.empresa_id || body?.company_id);
    let query = client
      .from('comissoes')
      .update({
        status: 'CANCELADA',
        data_pagamento: null,
        observacoes_pagamento: observacoes || null,
        pago_por: user.id
      })
      .in('recibo_id', comissao_ids.map((id: unknown) => String(id || '').trim()).filter(Boolean))
      .select('id');

    if (companyIds.length > 0) {
      query = query.in('company_id', companyIds);
    }

    const { data, error } = await query;
    if (error) {
      const code = String((error as { code?: string })?.code || '');
      const message = String((error as { message?: string })?.message || '').toLowerCase();
      if (code === '42P01' || code === '42703' || message.includes('does not exist')) {
        return json({ success: true, message: 'Persistência de comissão não disponível neste ambiente.', fallback: true });
      }
      throw error;
    }

    return json({
      success: true,
      message: `${(data || []).length} comissão(ões) cancelada(s).`,
      canceladas: (data || []).length
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao cancelar comissão.');
  }
}
