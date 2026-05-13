import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  logServerError,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { invalidateQuoteReadModels } from '$lib/server/readModelCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';

const MAX_ORCAMENTO_IMPORTAR_BODY_BYTES = 4 * 1024 * 1024;

type OrcamentoImportarBody = {
  client_id?: unknown;
  client_name?: unknown;
  client_whatsapp?: unknown;
  client_email?: unknown;
  destino_cidade_id?: unknown;
  data_embarque?: unknown;
  data_final?: unknown;
  draft?: unknown;
};

type ImportDraft = {
  items?: unknown;
  currency?: unknown;
  average_confidence?: unknown;
  raw_json?: unknown;
};

type ClienteScopeRow = {
  id?: unknown;
  company_id?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function sanitizeNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeLookupText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const EXCLUDED_TIPO_KEYS = new Set(
  ['Seguro viagem', 'Passagem Aerea', 'Passagem Facial', 'Aereo', 'Chip', 'Aluguel de Carro']
    .map((v) => normalizeLookupText(v))
);

export async function POST(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_ORCAMENTO_IMPORTAR_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Orcamentos'], 2, 'Sem permissao para importar orcamentos.');
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as OrcamentoImportarBody)
        : {};

    const clientId: string | null = body.client_id ? String(body.client_id) : null;
    const clientName: string | null = String(body.client_name || '').trim() || null;
    const clientWhatsapp: string | null = String(body.client_whatsapp || '').trim() || null;
    const clientEmail: string | null = String(body.client_email || '').trim() || null;
    const destinoCidadeId: string | null = body.destino_cidade_id ? String(body.destino_cidade_id) : null;
    const dataEmbarque: string | null = body.data_embarque ? String(body.data_embarque) : null;
    const dataFinal: string | null = body.data_final ? String(body.data_final) : null;
    const draft = isRecord(body.draft) ? (body.draft as ImportDraft) : null;

    if (!draft || !Array.isArray(draft.items) || draft.items.length === 0) {
      return json({ error: 'Nenhum item encontrado no rascunho.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (!clientId && !clientName) {
      return json({ error: 'Informe o nome do cliente antes de salvar.' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (clientId && !isUuid(clientId)) {
      return json({ error: 'Cliente invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (clientId) {
      const { data: cliente, error: clienteError } = await client
        .from('clientes')
        .select('id, company_id')
        .eq('id', clientId)
        .maybeSingle();
      if (clienteError) throw clienteError;
      const clienteRow = cliente as ClienteScopeRow | null;
      if (!clienteRow?.id) {
        return json({ error: 'Cliente nao encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });
      }
      const clienteCompanyId = String(clienteRow.company_id || '').trim();
      if (!scope.isAdmin && clienteCompanyId && !scope.companyIds.includes(clienteCompanyId)) {
        return json({ error: 'Cliente fora do seu escopo.' }, { status: 403, headers: NO_STORE_HEADERS });
      }
    }

    const items = draft.items as Array<Record<string, unknown>>;
    const subtotal = items.reduce((sum, item) => sum + sanitizeNumber(item.total_amount), 0);
    const taxesTotal = items.reduce((sum, item) => sum + sanitizeNumber(item.taxes_amount), 0);
    const total = subtotal;

    // 1. Criar o quote
    const { data: quote, error: quoteError } = await client
      .from('quote')
      .insert({
        created_by: user.id,
        client_id: clientId,
        client_name: clientName,
        client_whatsapp: clientWhatsapp,
        client_email: clientEmail,
        destino_cidade_id: destinoCidadeId,
        data_embarque: dataEmbarque,
        data_final: dataFinal,
        status: 'IMPORTED',
        currency: draft.currency || 'BRL',
        subtotal,
        taxes: taxesTotal,
        total,
        average_confidence: sanitizeNumber(draft.average_confidence),
        raw_json: draft.raw_json || {}
      })
      .select('id')
      .single();

    if (quoteError || !quote) {
      logServerError('[orcamentos/importar] erro ao criar quote', quoteError);
      return json({ error: 'Erro ao criar orçamento importado.' }, { status: 500, headers: NO_STORE_HEADERS });
    }

    // 2. Inserir itens
    const itensPayload = items.map((item, index) => ({
      quote_id: quote.id,
      item_type: item.item_type || 'servico',
      title: item.title || `Item ${index + 1}`,
      product_name: item.product_name || null,
      city_name: item.city_name || null,
      cidade_id: item.cidade_id || null,
      quantity: Math.max(1, Math.round(sanitizeNumber(item.quantity, 1))),
      unit_price: sanitizeNumber(item.unit_price),
      total_amount: sanitizeNumber(item.total_amount),
      taxes_amount: sanitizeNumber(item.taxes_amount),
      start_date: item.start_date || null,
      end_date: item.end_date || item.start_date || null,
      currency: item.currency || draft.currency || 'BRL',
      confidence: sanitizeNumber(item.confidence),
      order_index: typeof item.order_index === 'number' ? item.order_index : index,
      raw: item.raw || {}
    }));

    const { data: insertedItems, error: itemsError } = await client
      .from('quote_item')
      .insert(itensPayload)
      .select('id');

    if (itemsError) {
      await client.from('quote').delete().eq('id', quote.id);
      logServerError('[orcamentos/importar] erro ao inserir itens', itemsError);
      return json({ error: 'Erro ao salvar itens do orçamento.' }, { status: 500, headers: NO_STORE_HEADERS });
    }

    // 3. Inserir segmentos (se houver)
    const segmentPayloads: Array<Record<string, unknown>> = [];
    for (const [index, row] of (insertedItems || []).entries()) {
      const item = items[index];
      const segments = Array.isArray(item?.segments) ? item.segments : [];
      for (const [segIdx, seg] of segments.entries()) {
        segmentPayloads.push({
          quote_item_id: row.id,
          segment_type: seg.segment_type,
          data: seg.data || {},
          order_index: seg.order_index ?? segIdx
        });
      }
    }

    if (segmentPayloads.length > 0) {
      const { error: segError } = await client.from('quote_item_segment').insert(segmentPayloads);
      if (segError) {
        logServerError('[orcamentos/importar] Erro ao inserir segmentos', segError);
      }
    }

    // 4. Sincronizar produtos no catálogo (igual ao saveQuoteDraft do vtur-app)
    const { data: tiposData } = await client
      .from('tipo_produtos')
      .select('id, nome, tipo')
      .order('nome', { ascending: true })
      .limit(500);

    const tipoLabelMap = new Map<string, string>();
    for (const t of tiposData || []) {
      const label = String(t.nome || t.tipo || '').trim();
      const key = normalizeLookupText(label);
      if (key) tipoLabelMap.set(key, String(t.id));
    }

    for (const item of items) {
      const tipoKey = normalizeLookupText(String(item.item_type || ''));
      if (EXCLUDED_TIPO_KEYS.has(tipoKey)) continue;

      const nomeRaw = String(item.title || item.product_name || '').trim();
      if (!nomeRaw) continue;

      const destinoRaw = String(item.city_name || '').trim() || null;
      const cidadeId = item.cidade_id || null;
      const tipoId = tipoLabelMap.get(tipoKey) || null;

      try {
        let q = client.from('produtos').select('id').eq('nome', nomeRaw);
        if (destinoRaw) q = q.eq('destino', destinoRaw);
        else q = q.is('destino', null);
        if (cidadeId) q = q.eq('cidade_id', String(cidadeId));
        else q = q.is('cidade_id', null);

        const { data: existing } = await q.maybeSingle();
        const payload = { nome: nomeRaw, destino: destinoRaw, cidade_id: cidadeId, tipo_produto: tipoId };

        if (existing?.id) {
          await client.from('produtos').update(payload).eq('id', existing.id);
        } else {
          await client.from('produtos').insert(payload);
        }
      } catch {
        // Não interrompe o fluxo por falha na sincronização do catálogo
      }
    }

    // 5. Confirmar status
    const allValid = items.every(
      (item) =>
        item.item_type &&
        sanitizeNumber(item.quantity) > 0 &&
        item.start_date &&
        item.title &&
        sanitizeNumber(item.total_amount) > 0
    );

    const nextStatus = allValid ? 'CONFIRMED' : 'IMPORTED';
    await client
      .from('quote')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', quote.id);

    invalidateQuoteReadModels({
      companyIds: scope.companyIds,
      vendedorIds: [user.id],
      userId: user.id
    });

    return json({ ok: true, quote_id: quote.id, status: nextStatus }, { status: 201, headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao importar orçamento.');
  }
}
