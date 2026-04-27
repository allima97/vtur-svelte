import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeRecibo(numero: string): string {
  return numero.replace(/-/g, '').toUpperCase().trim();
}

function parseOptionalMoney(value: unknown): number | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function PATCH(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas'], 3, 'Sem permissao para editar recibos.');
    }

    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody) as {
      venda_id?: string;
      recibo_id?: string;
      numero_recibo?: string;
      produto_id?: string | null;
      destino_cidade_id?: string | null;
      numero_reserva?: string | null;
      data_inicio?: string | null;
      data_fim?: string | null;
      valor_total?: string | number | null;
      tipo_pacote?: string | null;
    } | null;

    const vendaId = String(body?.venda_id || '').trim();
    const reciboId = String(body?.recibo_id || '').trim();
    const numeroRecibo = String(body?.numero_recibo || '').trim();
    const produtoId = String(body?.produto_id || '').trim();
    const destinoCidadeId = String(body?.destino_cidade_id || '').trim();
    const numeroReserva = String(body?.numero_reserva || '').trim();
    const dataInicio = String(body?.data_inicio || '').trim();
    const dataFim = String(body?.data_fim || '').trim();
    const tipoPacote = String(body?.tipo_pacote || '').trim();
    const valorTotal = parseOptionalMoney(body?.valor_total);

    if (!isUuid(vendaId) || !isUuid(reciboId)) {
      return new Response('venda_id ou recibo_id invalido.', { status: 400 });
    }
    if (!numeroRecibo) {
      return new Response('numero_recibo e obrigatorio.', { status: 400 });
    }
    if (!isUuid(produtoId)) {
      return new Response('produto_id invalido.', { status: 400 });
    }
    if (destinoCidadeId && !isUuid(destinoCidadeId)) {
      return new Response('destino_cidade_id invalido.', { status: 400 });
    }

    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get('company_id') || event.url.searchParams.get('empresa_id')
    );
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get('vendedor_ids') || event.url.searchParams.get('vendedor_id')
    );

    // Verifica se a venda pertence ao escopo do usuário
    let saleQuery = client.from('vendas').select('id').eq('id', vendaId);
    if (companyIds.length > 0) saleQuery = saleQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) saleQuery = saleQuery.in('vendedor_id', vendedorIds);

    const { data: sale, error: saleError } = await saleQuery.maybeSingle();
    if (saleError) throw saleError;
    if (!sale) {
      return new Response('Venda nao encontrada.', { status: 404 });
    }

    // Verifica se o recibo pertence à venda
    const { data: recibo, error: reciboError } = await client
      .from('vendas_recibos')
      .select('id')
      .eq('id', reciboId)
      .eq('venda_id', vendaId)
      .maybeSingle();
    if (reciboError) throw reciboError;
    if (!recibo) {
      return new Response('Recibo nao encontrado.', { status: 404 });
    }

    const { data: produto, error: produtoError } = await client
      .from('produtos')
      .select('id, tipo_produto')
      .eq('id', produtoId)
      .maybeSingle();
    if (produtoError) throw produtoError;
    if (!produto) {
      return new Response('Produto nao encontrado.', { status: 404 });
    }

    const tipoProdutoId = String((produto as any)?.tipo_produto || '').trim();
    if (!isUuid(tipoProdutoId)) {
      return new Response('Produto sem tipo de produto valido.', { status: 400 });
    }

    const { data: updated, error: updateError } = await client
      .from('vendas_recibos')
      .update({
        numero_recibo: numeroRecibo,
        numero_recibo_normalizado: normalizeRecibo(numeroRecibo),
        produto_id: tipoProdutoId,
        produto_resolvido_id: produtoId,
        destino_cidade_id: destinoCidadeId || null,
        numero_reserva: numeroReserva || null,
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
        valor_total: valorTotal,
        tipo_pacote: tipoPacote || null
      })
      .eq('id', reciboId)
      .select('id, numero_recibo, numero_recibo_normalizado, produto_id, produto_resolvido_id, destino_cidade_id, numero_reserva, data_inicio, data_fim, valor_total, tipo_pacote')
      .maybeSingle();

    if (updateError) throw updateError;

    return json({ ok: true, recibo: updated });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao editar recibo.');
  }
}
