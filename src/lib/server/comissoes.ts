import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReportVendaRow } from '$lib/server/relatorios';

type CommissionRuleRow = {
  id: string;
  nome?: string | null;
  tipo?: string | null;
  meta_nao_atingida?: number | null;
  meta_atingida?: number | null;
  super_meta?: number | null;
  ativo?: boolean | null;
  company_id?: string | null;
};

type TipoPacoteRow = {
  id: string;
  nome?: string | null;
  ativo?: boolean | null;
  rule_id?: string | null;
  fix_meta_nao_atingida?: number | null;
  fix_meta_atingida?: number | null;
  fix_super_meta?: number | null;
};

export type CommissionContext = {
  rules: CommissionRuleRow[];
  packageTypes: TipoPacoteRow[];
};

export type ResolvedVendaCommission = {
  valorVenda: number;
  valorComissionavel: number;
  percentual: number;
  valorComissao: number;
  regraId: string | null;
  regraNome: string;
  tipoPacote: string | null;
};

function toNum(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function isMissingColumnError(error: unknown) {
  const code = String((error as { code?: string })?.code || '').trim();
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return code === '42703' || (message.includes('column') && message.includes('does not exist'));
}

function getRowTipoPacote(row: Pick<ReportVendaRow, 'recibos'>) {
  const recibos = Array.isArray(row.recibos) ? row.recibos : [];
  for (const recibo of recibos) {
    const tipo = String(recibo?.tipo_pacote || '').trim();
    if (tipo) return tipo;
  }
  return null;
}

function matchTipoPacote(tipoPacote: string | null, packageTypes: TipoPacoteRow[]) {
  const normalizedTipo = normalizeText(tipoPacote);
  if (!normalizedTipo) return null;

  return (
    packageTypes.find((item) => {
      const itemName = normalizeText(item.nome);
      return itemName === normalizedTipo || itemName.includes(normalizedTipo) || normalizedTipo.includes(itemName);
    }) || null
  );
}

function pickPreferredPercent(values: Array<number | null | undefined>) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function pickRuleForCompany(
  rules: CommissionRuleRow[],
  companyId?: string | null,
  ruleId?: string | null
) {
  const byId = ruleId ? rules.filter((rule) => String(rule.id || '') === String(ruleId)) : rules;
  if (byId.length === 0) return null;

  const scoped = companyId
    ? byId.filter((rule) => !rule.company_id || String(rule.company_id) === String(companyId))
    : byId;

  const exactCompany = scoped.find((rule) => rule.company_id && String(rule.company_id) === String(companyId || ''));
  if (exactCompany) return exactCompany;

  const globalRule = scoped.find((rule) => !rule.company_id);
  if (globalRule) return globalRule;

  return scoped[0] || byId[0] || null;
}

export async function fetchCommissionContext(
  client: SupabaseClient,
  companyIds: string[] = []
): Promise<CommissionContext> {
  let rules: CommissionRuleRow[] = [];

  const primaryRules = await client
    .from('commission_rule')
    .select('id, nome, tipo, meta_nao_atingida, meta_atingida, super_meta, ativo, company_id')
    .eq('ativo', true)
    .order('nome', { ascending: true })
    .limit(500);

  if (primaryRules.error && isMissingColumnError(primaryRules.error)) {
    const fallbackRules = await client
      .from('commission_rule')
      .select('id, nome, tipo, meta_nao_atingida, meta_atingida, super_meta, ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(500);

    if (fallbackRules.error) throw fallbackRules.error;
    rules = (fallbackRules.data || []) as CommissionRuleRow[];
  } else if (primaryRules.error) {
    throw primaryRules.error;
  } else {
    rules = (primaryRules.data || []) as CommissionRuleRow[];
  }

  if (companyIds.length > 0) {
    rules = rules.filter((rule) => !rule.company_id || companyIds.includes(String(rule.company_id)));
  }

  const tipoPacotesRes = await client
    .from('tipo_pacotes')
    .select('id, nome, ativo, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta')
    .eq('ativo', true)
    .order('nome', { ascending: true })
    .limit(500);

  if (tipoPacotesRes.error) throw tipoPacotesRes.error;

  return {
    rules,
    packageTypes: (tipoPacotesRes.data || []) as TipoPacoteRow[]
  };
}

export function resolveVendaCommission(
  row: Pick<ReportVendaRow, 'company_id' | 'valor_total' | 'valor_nao_comissionado' | 'recibos'>,
  context: CommissionContext
): ResolvedVendaCommission {
  const valorVenda = toNum(row.valor_total);
  const valorNaoComissionado = toNum(row.valor_nao_comissionado);
  const valorComissionavel = Math.max(0, roundMoney(valorVenda - valorNaoComissionado));
  const tipoPacote = getRowTipoPacote(row);
  const matchedTipoPacote = matchTipoPacote(tipoPacote, context.packageTypes);

  let percentual = 0;
  let regraId: string | null = null;
  let regraNome = 'Sem regra';

  if (matchedTipoPacote) {
    percentual = pickPreferredPercent([
      matchedTipoPacote.fix_meta_atingida,
      matchedTipoPacote.fix_super_meta,
      matchedTipoPacote.fix_meta_nao_atingida
    ]);

    if (percentual > 0) {
      regraNome = `${matchedTipoPacote.nome || 'Tipo de pacote'} (fixo)`;
    } else if (matchedTipoPacote.rule_id) {
      const pacoteRule = pickRuleForCompany(context.rules, row.company_id, matchedTipoPacote.rule_id);
      if (pacoteRule) {
        regraId = pacoteRule.id;
        percentual = pickPreferredPercent([
          pacoteRule.meta_atingida,
          pacoteRule.super_meta,
          pacoteRule.meta_nao_atingida
        ]);
        regraNome = String(pacoteRule.nome || 'Regra do pacote');
      }
    }
  }

  if (percentual <= 0) {
    const defaultRule = pickRuleForCompany(context.rules, row.company_id);
    if (defaultRule) {
      regraId = defaultRule.id;
      percentual = pickPreferredPercent([
        defaultRule.meta_atingida,
        defaultRule.super_meta,
        defaultRule.meta_nao_atingida
      ]);
      regraNome = String(defaultRule.nome || 'Regra padrão');
    }
  }

  const valorComissao = percentual > 0 ? roundMoney((valorComissionavel * percentual) / 100) : 0;

  return {
    valorVenda,
    valorComissionavel,
    percentual,
    valorComissao,
    regraId,
    regraNome,
    tipoPacote
  };
}
