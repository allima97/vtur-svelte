/**
 * readModelRebuild.ts
 *
 * Módulo central de reconstrução do read model de ranking/KPIs.
 *
 * O banco de dados mantém a tabela ranking_read_model_status com os campos:
 *   status: 'dirty' | 'rebuilding' | 'ready' | 'error'
 *   dirty_at: quando foi marcado dirty (via trigger após INSERT/UPDATE/DELETE em vendas)
 *   rebuilt_at: quando foi reconstruído com sucesso
 *
 * Este módulo:
 *   1. Detecta entradas dirty no banco
 *   2. Reconstrói o read model empresa por empresa, mês a mês
 *   3. Expõe triggerRebuildAsync() para fire-and-forget após save de venda
 *   4. Expõe rebuildReadModelForCompanyMonth() para o endpoint/cron
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient, logServerError } from '$lib/server/v1';
import { fetchVendasKpiReciboContributionsRaw } from '$lib/server/vendas-kpis';
import { chunkArray } from '$lib/utils/array';

const MODEL_NAME = 'recibo_contribuicoes_v1';
const TABLE_STATUS = 'ranking_read_model_status';
const TABLE_CONTRIBUICOES = 'ranking_recibo_contribuicoes';
const INSERT_CHUNK_SIZE = 500;

// Throttle: evita múltiplos rebuilds simultâneos para a mesma empresa/mês
const inProgressKeys = new Set<string>();

// Últimos parâmetros agendados para fire-and-forget
let pendingRebuildParams: { companyIds: string[]; monthKeys: string[] } | null = null;
let rebuildScheduled = false;

function monthStartFromKey(monthKey: string) {
  return `${monthKey}-01`;
}

function monthEndFromKey(monthKey: string) {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthStartFromKey(monthKey);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function monthKeyFromDate(date: string) {
  return `${date.slice(0, 4)}-${date.slice(5, 7)}`;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function previousMonthKey() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toUuidOrNull(value?: string | null): string | null {
  if (!value) return null;
  const v = String(value).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : null;
}

function buildSourceKey(
  contribution: any,
  companyId: string,
  mes: string,
): string {
  return [
    companyId,
    mes,
    contribution.vendedorId,
    contribution.vendaKey,
    contribution.reciboId || contribution.reciboNumero || 'sem-recibo',
    contribution.reciboDate,
    contribution.factor,
    contribution.bruto,
    contribution.taxas,
  ]
    .map((p) => String(p ?? '').replace(/\|/g, '/'))
    .join('|');
}

async function fetchDirtyEntries(
  client: SupabaseClient,
  companyIds: string[],
  monthKeys: string[],
): Promise<Array<{ company_id: string; mes: string; monthKey: string }>> {
  let query = client
    .from(TABLE_STATUS)
    .select('company_id, mes, status')
    .eq('modelo', MODEL_NAME)
    .in('status', ['dirty', 'error']);

  if (companyIds.length > 0) query = query.in('company_id', companyIds);

  if (monthKeys.length > 0) {
    const monthStarts = monthKeys.map(monthStartFromKey);
    query = query.in('mes', monthStarts);
  }

  // Limitar para evitar sobrecarga — processar no máximo 50 por rodada
  query = query.order('dirty_at', { ascending: true }).limit(50);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    company_id: String(row.company_id),
    mes: String(row.mes).slice(0, 10),
    monthKey: monthKeyFromDate(String(row.mes).slice(0, 10)),
  }));
}

async function upsertStatus(
  client: SupabaseClient,
  companyId: string,
  mes: string,
  values: Record<string, unknown>,
) {
  const { error } = await client.from(TABLE_STATUS).upsert(
    {
      modelo: MODEL_NAME,
      company_id: companyId,
      mes,
      ...values,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'modelo,company_id,mes' },
  );
  if (error) throw error;
}

async function rebuildOneMonth(
  client: SupabaseClient,
  companyId: string,
  monthKey: string,
): Promise<{ rebuilt: boolean; rows: number; error?: string }> {
  const progressKey = `${companyId}|${monthKey}`;
  if (inProgressKeys.has(progressKey)) {
    return { rebuilt: false, rows: 0 };
  }

  inProgressKeys.add(progressKey);
  const mes = monthStartFromKey(monthKey);
  const dataInicio = mes;
  const dataFim = monthEndFromKey(monthKey);

  try {
    // Marcar como rebuilding para evitar dupla execução entre instâncias
    await upsertStatus(client, companyId, mes, {
      status: 'rebuilding',
      dirty_at: null,
      rebuilt_at: null,
      last_error: null,
    });

    // Calcular contribuições usando o pipeline raw (sem cache do read model)
    const payload = await fetchVendasKpiReciboContributionsRaw(client, {
      dataInicio,
      dataFim,
      companyIds: [companyId],
      vendedorIds: [],
      accessibleClientIds: [],
    });

    // Converter contributions para linhas da tabela
    const rows = (payload.contributions || [])
      .map((contribution) => {
        const cId = String(contribution.companyId || companyId).trim() || companyId;
        if (!cId || !contribution.vendedorId) return null;
        const bruto = Number(Number(contribution.bruto).toFixed(2));
        const taxas = Number(Number(contribution.taxas).toFixed(2));
        return {
          source_key: buildSourceKey(contribution, cId, mes),
          company_id: cId,
          mes,
          data_recibo: contribution.reciboDate || mes,
          vendedor_id: contribution.vendedorId,
          cliente_id: toUuidOrNull(contribution.clienteId),
          venda_id: toUuidOrNull(contribution.vendaId),
          recibo_id: toUuidOrNull(contribution.reciboId),
          venda_key: contribution.vendaKey || 'sem-venda',
          recibo_numero: contribution.reciboNumero || null,
          produto_id: toUuidOrNull(contribution.produtoId),
          produto_nome: contribution.produtoNome || null,
          destino_nome: contribution.destinoNome || null,
          valor_bruto: bruto,
          valor_taxas: taxas,
          valor_seguro: contribution.isSeguro ? bruto : 0,
          is_seguro: Boolean(contribution.isSeguro),
          fator: Number(Number(contribution.factor).toFixed(6)),
          source_bruto: Number(Number(contribution.sourceBruto).toFixed(2)),
          source_taxas: Number(Number(contribution.sourceTaxas).toFixed(2)),
          origem: contribution.origem || 'ranking_ts',
          built_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    // Substituir atomicamente: deletar o mês e reinserir
    const { error: deleteError } = await client
      .from(TABLE_CONTRIBUICOES)
      .delete()
      .eq('company_id', companyId)
      .eq('mes', mes);

    if (deleteError) throw deleteError;

    for (const chunk of chunkArray(rows, INSERT_CHUNK_SIZE)) {
      if (chunk.length === 0) continue;
      const { error: upsertError } = await client
        .from(TABLE_CONTRIBUICOES)
        .upsert(chunk, { onConflict: 'source_key' });
      if (upsertError) throw upsertError;
    }

    await upsertStatus(client, companyId, mes, {
      status: 'ready',
      dirty_at: null,
      rebuilt_at: new Date().toISOString(),
      last_error: null,
    });

    return { rebuilt: true, rows: rows.length };
  } catch (err) {
    const errMsg = String((err as any)?.message || err).slice(0, 500);
    logServerError(`[read-model] rebuild falhou para ${companyId} / ${monthKey}`, err);

    await upsertStatus(client, companyId, mes, {
      status: 'error',
      dirty_at: new Date().toISOString(),
      rebuilt_at: null,
      last_error: errMsg,
    }).catch(() => undefined);

    return { rebuilt: false, rows: 0, error: errMsg };
  } finally {
    inProgressKeys.delete(progressKey);
  }
}

/**
 * Reconstrução completa: detecta dirty e reconstrói tudo.
 * Usada pelo endpoint POST/GET e pelo cron.
 */
export async function rebuildReadModelForCompanyMonth(
  client: SupabaseClient,
  params: {
    companyIds: string[];
    monthKeys: string[];
    rebuildAll?: boolean;
  },
): Promise<{
  processed: number;
  rebuilt: number;
  errors: number;
  skipped: number;
  details: Array<{ company_id: string; month: string; status: string; rows?: number }>;
}> {
  const dirtyEntries = await fetchDirtyEntries(
    client,
    params.companyIds,
    params.monthKeys,
  );

  // Se não há dirty mas foram passados company_ids + month_keys explícitos,
  // forçar rebuild mesmo sem status dirty (útil para rebuild manual)
  const explicitEntries: Array<{ company_id: string; mes: string; monthKey: string }> = [];
  if (params.companyIds.length > 0 && params.monthKeys.length > 0 && dirtyEntries.length === 0) {
    for (const companyId of params.companyIds) {
      for (const monthKey of params.monthKeys) {
        explicitEntries.push({ company_id: companyId, mes: monthStartFromKey(monthKey), monthKey });
      }
    }
  }

  const entries = dirtyEntries.length > 0 ? dirtyEntries : explicitEntries;

  const details: Array<{ company_id: string; month: string; status: string; rows?: number }> = [];
  let rebuilt = 0;
  let errors = 0;
  let skipped = 0;

  for (const entry of entries) {
    const progressKey = `${entry.company_id}|${entry.monthKey}`;
    if (inProgressKeys.has(progressKey)) {
      skipped++;
      details.push({ company_id: entry.company_id, month: entry.monthKey, status: 'skipped_in_progress' });
      continue;
    }

    const result = await rebuildOneMonth(client, entry.company_id, entry.monthKey);
    if (result.rebuilt) {
      rebuilt++;
      details.push({ company_id: entry.company_id, month: entry.monthKey, status: 'rebuilt', rows: result.rows });
    } else if (result.error) {
      errors++;
      details.push({ company_id: entry.company_id, month: entry.monthKey, status: 'error' });
    } else {
      skipped++;
      details.push({ company_id: entry.company_id, month: entry.monthKey, status: 'skipped' });
    }
  }

  return {
    processed: entries.length,
    rebuilt,
    errors,
    skipped,
    details,
  };
}

/**
 * triggerRebuildAsync — fire-and-forget após save de venda.
 *
 * Não bloqueia a resposta ao usuário. Agenda a reconstrução para
 * o(s) mês(es) afetado(s) usando queueMicrotask para rodar após
 * a resposta ser enviada.
 *
 * Em Cloudflare Workers, usar event.waitUntil() é mais robusto —
 * mas como não temos acesso ao ExecutionContext aqui, usamos
 * queueMicrotask + setTimeout como fallback compatível.
 */
export function triggerRebuildAsync(params: {
  companyIds: string[];
  dataVenda?: string | null;
  executionContext?: { waitUntil: (p: Promise<unknown>) => void } | null;
}) {
  const companyIds = params.companyIds.filter(Boolean);
  if (companyIds.length === 0) return;

  const monthKey = params.dataVenda
    ? monthKeyFromDate(params.dataVenda)
    : currentMonthKey();

  // Sempre incluir o mês anterior caso a venda caia na virada
  const prevMonth = previousMonthKey();
  const monthKeys = Array.from(new Set([monthKey, prevMonth]));

  // Acumular parâmetros para coalescing: múltiplas vendas salvas em rápida
  // sucessão geram apenas um rebuild em vez de vários simultâneos
  if (!pendingRebuildParams) {
    pendingRebuildParams = { companyIds: [...companyIds], monthKeys };
  } else {
    for (const id of companyIds) {
      if (!pendingRebuildParams.companyIds.includes(id)) {
        pendingRebuildParams.companyIds.push(id);
      }
    }
    for (const mk of monthKeys) {
      if (!pendingRebuildParams.monthKeys.includes(mk)) {
        pendingRebuildParams.monthKeys.push(mk);
      }
    }
  }

  if (rebuildScheduled) return;
  rebuildScheduled = true;

  const runRebuild = async () => {
    const toProcess = pendingRebuildParams;
    pendingRebuildParams = null;
    rebuildScheduled = false;

    if (!toProcess) return;

    try {
      const client = getAdminClient();

      // Marcar entradas como dirty explicitamente para os meses afetados
      // (os triggers do banco já fazem isso, mas a marcação explícita garante
      // que o rebuild rode mesmo se o trigger não disparou ainda)
      for (const companyId of toProcess.companyIds) {
        for (const mk of toProcess.monthKeys) {
          const mes = monthStartFromKey(mk);
          await upsertStatus(client, companyId, mes, {
            status: 'dirty',
            dirty_at: new Date().toISOString(),
          }).catch(() => undefined);
        }
      }

      await rebuildReadModelForCompanyMonth(client, {
        companyIds: toProcess.companyIds,
        monthKeys: toProcess.monthKeys,
        rebuildAll: false,
      });
    } catch (err) {
      logServerError('[read-model] triggerRebuildAsync falhou', err);
    }
  };

  const rebuildPromise = new Promise<void>((resolve) => {
    // Pequeno delay para coalescing: aguarda 200ms acumulando mais saves
    setTimeout(() => {
      resolve();
    }, 200);
  }).then(runRebuild);

  // Se o Cloudflare ExecutionContext estiver disponível, registrar o
  // promise para garantir que o Worker não seja encerrado antes do rebuild
  if (params.executionContext?.waitUntil) {
    params.executionContext.waitUntil(rebuildPromise);
  }
}

/**
 * markDirtyForCompany — marca um mês como dirty diretamente.
 * Útil quando o trigger do banco pode não ter coberto a operação.
 */
export async function markDirtyForCompany(
  client: SupabaseClient,
  companyId: string,
  dataVenda: string,
) {
  const monthKey = monthKeyFromDate(dataVenda);
  const mes = monthStartFromKey(monthKey);
  try {
    await upsertStatus(client, companyId, mes, {
      status: 'dirty',
      dirty_at: new Date().toISOString(),
    });
  } catch (err) {
    logServerError('[read-model] markDirtyForCompany falhou', err);
  }
}
