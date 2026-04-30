import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import type { ConciliacaoLinhaInput } from '../_types';
import {
  isConciliacaoImportavel,
  normalizeConciliacaoDescricaoKey,
  buildConciliacaoMetrics,
  resolveConciliacaoStatus,
} from '$lib/conciliacao/business';
import { diagnosticarLacunasCronologicas } from '$lib/server/conciliacaoReconcile';

// ---------------------------------------------------------------------------
// Helpers de número de recibo
// ---------------------------------------------------------------------------

function normalizeNumeroRecibo(value: string) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function onlyDigits(value?: string | null) {
  return String(value ?? '').replace(/\D+/g, '');
}

function reciboCoreDigits(value?: string | null) {
  const digits = onlyDigits(value);
  if (!digits) return '';
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function stripLeadingZeros(value?: string | null) {
  const raw = String(value ?? '').replace(/^0+/, '');
  return raw || '0';
}

function extractReciboPrefix(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const prefixMatch = raw.match(/^(\d{4})\D+/);
  if (prefixMatch?.[1]) return prefixMatch[1];
  const digits = onlyDigits(raw);
  return digits.length >= 14 ? digits.slice(0, 4) : '';
}

function numeroReciboMatches(left?: string | null, right?: string | null) {
  const leftCompact = normalizeNumeroRecibo(String(left || ''));
  const rightCompact = normalizeNumeroRecibo(String(right || ''));
  if (leftCompact && rightCompact && leftCompact === rightCompact) return true;

  const leftDigits = onlyDigits(left);
  const rightDigits = onlyDigits(right);
  if (!leftDigits || !rightDigits) return false;
  if (leftDigits === rightDigits) return true;

  const leftCore = reciboCoreDigits(leftDigits);
  const rightCore = reciboCoreDigits(rightDigits);
  if (leftCore && rightCore && leftCore === rightCore) return true;

  const leftSignificantCore = stripLeadingZeros(leftCore);
  const rightSignificantCore = stripLeadingZeros(rightCore);
  if (!leftSignificantCore || !rightSignificantCore || leftSignificantCore !== rightSignificantCore) {
    return false;
  }

  const leftPrefix = extractReciboPrefix(left);
  const rightPrefix = extractReciboPrefix(right);
  if (leftPrefix && rightPrefix) return leftPrefix === rightPrefix;
  return true;
}

function matches(a: number, b: number) {
  return Math.abs(a - b) <= 0.01;
}

// ---------------------------------------------------------------------------
// Busca de recibos no sistema (para auto-link de vendedor)
// ---------------------------------------------------------------------------

type ReciboCandidate = {
  id: string;
  venda_id: string;
  vendedor_id: string | null;
  numero_recibo: string | null;
  valor_total: number | null;
  valor_taxas: number | null;
};

async function fetchReciboCandidates(params: {
  client: any;
  numero: string;
  companyId: string;
}): Promise<ReciboCandidate[]> {
  const { client, numero, companyId } = params;

  const numeroNormalizado = normalizeNumeroRecibo(numero);
  const token = stripLeadingZeros(reciboCoreDigits(numero));
  const byId = new Map<string, ReciboCandidate>();

  const [normResp, exactResp, fuzzyResp] = await Promise.all([
    numeroNormalizado
      ? client
          .from('vendas_recibos')
          .select('id, venda_id, numero_recibo, valor_total, valor_taxas')
          .eq('numero_recibo_normalizado', numeroNormalizado)
          .limit(30)
      : Promise.resolve({ data: [] as any[] }),
    numero
      ? client
          .from('vendas_recibos')
          .select('id, venda_id, numero_recibo, valor_total, valor_taxas')
          .eq('numero_recibo', numero)
          .limit(30)
      : Promise.resolve({ data: [] as any[] }),
    token && token.length >= 5
      ? client
          .from('vendas_recibos')
          .select('id, venda_id, numero_recibo, valor_total, valor_taxas')
          .ilike('numero_recibo', `%${token}%`)
          .limit(50)
      : Promise.resolve({ data: [] as any[] })
  ]);

  for (const row of [...(normResp?.data || []), ...(exactResp?.data || []), ...(fuzzyResp?.data || [])]) {
    const id = String(row?.id || '').trim();
    const vendaId = String(row?.venda_id || '').trim();
    if (!id || !vendaId) continue;
    if (!numeroReciboMatches(numero, row?.numero_recibo)) continue;
    byId.set(id, {
      id,
      venda_id: vendaId,
      vendedor_id: null,
      numero_recibo: row?.numero_recibo ?? null,
      valor_total: row?.valor_total ?? null,
      valor_taxas: row?.valor_taxas ?? null
    });
  }

  const candidates = Array.from(byId.values());
  if (candidates.length === 0) return [];

  const vendaIds = Array.from(new Set(candidates.map((row) => row.venda_id)));
  const { data: vendas } = await client
    .from('vendas')
    .select('id, company_id, vendedor_id')
    .in('id', vendaIds)
    .eq('company_id', companyId);

  const vendaMap = new Map<string, { company_id: string | null; vendedor_id: string | null }>();
  for (const row of vendas || []) {
    const id = String((row as any)?.id || '').trim();
    if (!id) continue;
    vendaMap.set(id, {
      company_id: String((row as any)?.company_id || '').trim() || null,
      vendedor_id: String((row as any)?.vendedor_id || '').trim() || null
    });
  }

  return candidates
    .filter((row) => Boolean(vendaMap.get(row.venda_id)?.company_id))
    .map((row) => ({
      ...row,
      vendedor_id: vendaMap.get(row.venda_id)?.vendedor_id || null
    }));
}

async function findReciboByNumero(params: {
  client: any;
  companyId: string;
  numero: string;
  valorLancamento?: number | null;
  valorTaxas?: number | null;
}) {
  const numero = String(params.numero || '').trim();
  if (!numero) return null;
  const rows = await fetchReciboCandidates({
    client: params.client,
    numero,
    companyId: params.companyId
  });

  if (rows.length === 0) return null;

  const targetTotal = Number(params.valorLancamento || 0);
  const targetTaxas = Number(params.valorTaxas || 0);

  const reciboExato = rows.find((item: any) => String(item?.numero_recibo || '').trim() === numero);
  if (reciboExato) return { recibo: reciboExato };

  const compativeis = rows.filter((item: any) => numeroReciboMatches(numero, item?.numero_recibo));
  if (compativeis.length === 0) return null;

  const ranked = [...compativeis].sort((a: any, b: any) => {
    const aTotalDiff = Math.abs(Number(a?.valor_total || 0) - targetTotal);
    const bTotalDiff = Math.abs(Number(b?.valor_total || 0) - targetTotal);
    if (aTotalDiff !== bTotalDiff) return aTotalDiff - bTotalDiff;
    const aTaxDiff = Math.abs(Number(a?.valor_taxas || 0) - targetTaxas);
    const bTaxDiff = Math.abs(Number(b?.valor_taxas || 0) - targetTaxas);
    return aTaxDiff - bTaxDiff;
  });

  const porValor = ranked.filter((item: any) => (params.valorLancamento == null ? true : matches(Number(item?.valor_total || 0), targetTotal)));
  const porTaxas = porValor.filter((item: any) => (params.valorTaxas == null ? true : matches(Number(item?.valor_taxas || 0), targetTaxas)));

  const escolhido =
    (porTaxas.length === 1 ? porTaxas[0] : null) ||
    (porValor.length === 1 ? porValor[0] : null) ||
    (ranked.length === 1 ? ranked[0] : null);

  return escolhido ? { recibo: escolhido } : null;
}

// ---------------------------------------------------------------------------
// Chaves de deduplicação de importação
// ---------------------------------------------------------------------------

function buildImportKey(
  companyId: string,
  movimentoData?: string | null,
  documento?: string | null,
  descricao?: string | null
) {
  return [
    companyId,
    String(movimentoData || '').trim(),
    String(documento || '').trim(),
    normalizeConciliacaoDescricaoKey(descricao)
  ].join('::');
}

/** Chave sem descrição — usada no fallbackMap para capturar o mesmo recibo
 *  que veio com descrição levemente diferente em importações subsequentes. */
function buildImportFallbackKey(
  companyId: string,
  movimentoData?: string | null,
  documento?: string | null
) {
  return [
    companyId,
    String(movimentoData || '').trim(),
    String(documento || '').trim()
  ].join('::');
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 3, 'Sem permissão para importar conciliação.');
    }

    const body = await event.request.json();
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId);
    const companyId = companyIds[0] || scope.companyId;

    if (!companyId) return json({ error: 'Empresa não identificada.' }, { status: 400 });

    const linhas: ConciliacaoLinhaInput[] = Array.isArray(body?.linhas) ? body.linhas : [];
    if (linhas.length === 0) return json({ error: 'Nenhuma linha para importar.' }, { status: 400 });

    // Filtra apenas linhas importáveis (BAIXA / OPFAX / ESTORNO)
    const importaveis = linhas.filter((linha) =>
      isConciliacaoImportavel({ status: linha.status, descricao: linha.descricao })
    );

    if (importaveis.length === 0) {
      return json({ ok: true, importados: 0, ignorados: linhas.length, message: 'Nenhuma linha com status importável (BAIXA/OPFAX/ESTORNO).' });
    }

    // ── Validação: todas as linhas precisam ter data de movimento ─────────
    const semDataMovimento = importaveis.filter((linha) => !String(linha.movimento_data || '').trim());
    if (semDataMovimento.length > 0) {
      return json(
        {
          error: 'Data do movimento não identificada no arquivo. A importação não grava a data atual como fallback.',
          sem_data_movimento: semDataMovimento.length
        },
        { status: 400 }
      );
    }

    // ── Busca registros já existentes (exactMap + fallbackMap) ────────────
    const { data: existentes } = await client
      .from('conciliacao_recibos')
      .select('id, documento, movimento_data, descricao, ranking_vendedor_id, ranking_produto_id, venda_id, venda_recibo_id')
      .eq('company_id', companyId)
      .in('documento', importaveis.map((l) => l.documento))
      .limit(5000);

    // Mapa exato: chave = companyId::data::documento::descricao
    const existentesByKey = new Map<string, any>(
      (existentes || []).map((row: any) => [
        buildImportKey(companyId, row.movimento_data, row.documento, row.descricao),
        row
      ])
    );

    // Mapa fallback: chave = companyId::data::documento (sem descrição)
    // Usado quando a descrição mudou levemente entre importações (evita duplicatas)
    const existentesByFallbackKey = new Map<string, any[]>();
    for (const row of existentes || []) {
      const fk = buildImportFallbackKey(companyId, (row as any).movimento_data, (row as any).documento);
      const bucket = existentesByFallbackKey.get(fk) || [];
      bucket.push(row);
      existentesByFallbackKey.set(fk, bucket);
    }

    // ── Build de cada linha a inserir/atualizar ───────────────────────────
    const buildRow = async (l: ConciliacaoLinhaInput) => {
      const statusResolvido = resolveConciliacaoStatus({
        status: l.status,
        descricao: l.descricao,
      });

      const metrics = buildConciliacaoMetrics({
        descricao: l.descricao,
        valorLancamentos: l.valor_lancamentos,
        valorTaxas: l.valor_taxas,
        valorDescontos: l.valor_descontos,
        valorAbatimentos: l.valor_abatimentos,
        valorNaoComissionavel: l.valor_nao_comissionavel,
        valorSaldo: l.valor_saldo,
        valorOpfax: l.valor_opfax,
        valorCalculadaLoja: l.valor_calculada_loja,
        valorVisaoMaster: l.valor_visao_master,
        valorComissaoLoja: l.valor_comissao_loja,
        percentualComissaoLoja: l.percentual_comissao_loja,
      });

      let rankingVendedorId = String(l.ranking_vendedor_id || '').trim() || null;
      let vendaId = String((l as any).venda_id || '').trim() || null;
      let vendaReciboId = String((l as any).venda_recibo_id || '').trim() || null;

      if (!rankingVendedorId || !vendaReciboId || !vendaId) {
        const found = await findReciboByNumero({
          numero: l.documento,
          companyId,
          valorLancamento: l.valor_lancamentos ?? null,
          valorTaxas: l.valor_taxas ?? null,
          client
        });

        if (found?.recibo) {
          rankingVendedorId = rankingVendedorId || String(found.recibo.vendedor_id || '').trim() || null;
          vendaId = vendaId || String(found.recibo.venda_id || '').trim() || null;
          vendaReciboId = vendaReciboId || String(found.recibo.id || '').trim() || null;
        }
      }

      return {
        company_id: companyId,
        documento: String(l.documento || '').trim(),
        movimento_data: String(l.movimento_data || '').trim(),
        status: statusResolvido,
        descricao: String(l.descricao || '').trim() || null,
        descricao_chave: metrics.descricaoChave || null,
        valor_lancamentos: l.valor_lancamentos ?? null,
        valor_taxas: l.valor_taxas ?? null,
        valor_descontos: l.valor_descontos ?? null,
        valor_abatimentos: l.valor_abatimentos ?? null,
        valor_nao_comissionavel: l.valor_nao_comissionavel ?? null,
        valor_calculada_loja: l.valor_calculada_loja ?? null,
        valor_visao_master: l.valor_visao_master ?? null,
        valor_opfax: l.valor_opfax ?? null,
        valor_saldo: l.valor_saldo ?? null,
        valor_venda_real: metrics.valorVendaReal,
        valor_comissao_loja: metrics.valorComissaoLoja,
        percentual_comissao_loja: metrics.percentualComissaoLoja,
        faixa_comissao: metrics.faixaComissao,
        is_seguro_viagem: metrics.isSeguroViagem,
        ranking_vendedor_id: rankingVendedorId,
        ranking_produto_id: String(l.ranking_produto_id || '').trim() || null,
        venda_id: vendaId,
        venda_recibo_id: vendaReciboId,
        origem: String(l.origem || 'manual').trim(),
        conciliado: false,
      };
    };

    const usedExistingIds = new Set<string>();
    const rowsToInsert: any[] = [];
    const rowsToUpdate: Array<{ id: string; values: Record<string, any> }> = [];

    for (const l of importaveis) {
      const row = await buildRow(l);

      // 1ª tentativa: chave exata (inclui descrição normalizada)
      let existing: any =
        existentesByKey.get(buildImportKey(companyId, l.movimento_data, l.documento, l.descricao)) || null;

      // 2ª tentativa: chave fallback (sem descrição) — evita duplicatas por variação de descrição
      if (!existing) {
        const fk = buildImportFallbackKey(companyId, l.movimento_data, l.documento);
        const candidates = (existentesByFallbackKey.get(fk) || []).filter(
          (c: any) => !usedExistingIds.has(String(c.id))
        );
        if (candidates.length > 0) {
          // Prefere o registro com mesmos valores financeiros; fallback: o mais recente (primeiro)
          existing = candidates[0];
        }
      }

      if (existing?.id) {
        usedExistingIds.add(String(existing.id));
        const values = { ...row };
        delete (values as any).company_id;
        rowsToUpdate.push({
          id: String(existing.id),
          values: {
            ...values,
            // Preserva atribuições manuais de vendedor/produto/venda já existentes
            ranking_vendedor_id: values.ranking_vendedor_id ?? existing.ranking_vendedor_id ?? null,
            ranking_produto_id: values.ranking_produto_id ?? existing.ranking_produto_id ?? null,
            venda_id: values.venda_id ?? existing.venda_id ?? null,
            venda_recibo_id: values.venda_recibo_id ?? existing.venda_recibo_id ?? null,
            // Reseta estado de conciliação para reprocessamento
            match_total: null,
            match_taxas: null,
            sistema_valor_total: null,
            sistema_valor_taxas: null,
            diff_total: null,
            diff_taxas: null,
            last_checked_at: null,
            conciliado_em: null
          }
        });
      } else {
        rowsToInsert.push(row);
      }
    }

    // ── Persist ───────────────────────────────────────────────────────────
    let atualizados = 0;
    for (const item of rowsToUpdate) {
      const { error: updateError } = await client
        .from('conciliacao_recibos')
        .update(item.values)
        .eq('id', item.id)
        .eq('company_id', companyId);
      if (updateError) throw updateError;
      atualizados += 1;
    }

    const BATCH = 100;
    let importados = 0;
    for (let i = 0; i < rowsToInsert.length; i += BATCH) {
      const batch = rowsToInsert.slice(i, i + BATCH);
      const { error: insertError } = await client.from('conciliacao_recibos').insert(batch);
      if (insertError) throw insertError;
      importados += batch.length;
    }

    // ── Diagnóstico cronológico pós-importação ────────────────────────────
    // Informa imediatamente ao usuário se ainda há lacunas após o upload,
    // ou seja, se a conciliação ficará bloqueada por dias faltantes.
    const diagnostico = await diagnosticarLacunasCronologicas({ client, companyId });

    const fmt = (d: string) => {
      const [y, m, dia] = d.split('-');
      return `${dia}/${m}/${y}`;
    };

    const temLacuna = diagnostico.diasFaltantes.length > 0;
    const statusCronologico = temLacuna
      ? {
          ok: false,
          fronteira: diagnostico.fronteira,
          dias_faltantes: diagnostico.diasFaltantes,
          dias_bloqueados: diagnostico.diasBloqueados,
          registros_bloqueados: diagnostico.registrosBloqueados,
          aviso:
            `Arquivo salvo com sucesso, mas a conciliação está bloqueada a partir de ${fmt(diagnostico.fronteira!)}. ` +
            `Ainda faltam os arquivos dos dias: ${diagnostico.diasFaltantes.map(fmt).join(', ')}. ` +
            `Importe esses arquivos para liberar ${diagnostico.registrosBloqueados} registro(s) bloqueado(s).`
        }
      : {
          ok: true,
          fronteira: diagnostico.fronteira,
          dias_faltantes: [],
          dias_bloqueados: [],
          registros_bloqueados: 0,
          aviso: diagnostico.fronteira
            ? `Sequência OK até ${fmt(diagnostico.fronteira)}. Conciliação liberada.`
            : 'Primeiro arquivo importado.'
        };

    return json({
      ok: true,
      importados,
      atualizados,
      ignorados: linhas.length - importaveis.length,
      duplicados: atualizados,
      status_cronologico: statusCronologico
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao importar conciliação.');
  }
}
