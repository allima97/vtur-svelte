import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

type ConciliacaoLinhaInput = {
  documento: string;
  movimento_data: string;
  status: string;
  descricao?: string | null;
  valor_lancamentos?: number | null;
  valor_taxas?: number | null;
  valor_descontos?: number | null;
  valor_abatimentos?: number | null;
  valor_nao_comissionavel?: number | null;
  valor_calculada_loja?: number | null;
  valor_visao_master?: number | null;
  valor_opfax?: number | null;
  valor_saldo?: number | null;
  valor_venda_real?: number | null;
  valor_comissao_loja?: number | null;
  percentual_comissao_loja?: number | null;
  faixa_comissao?: string | null;
  is_seguro_viagem?: boolean;
  origem?: string | null;
};

function normalizeText(value?: string | null) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function isConciliacaoImportavel(params: { status?: string | null; descricao?: string | null }) {
  const raw = normalizeText(params.descricao || params.status);
  return raw.includes('BAIXA') || raw.includes('OPFAX') || raw.includes('ESTORNO');
}

function buildImportKey(companyId: string, movimentoData: string, documento: string, descricao?: string | null) {
  return [companyId, movimentoData, documento, normalizeText(descricao)].join('::');
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['conciliacao'], 3, 'Sem permissão para importar conciliação.');
    }

    const body = await event.request.json();
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId);
    const companyId = companyIds[0] || scope.companyId;

    if (!companyId) return json({ error: 'Empresa não identificada.' }, { status: 400 });

    const linhas: ConciliacaoLinhaInput[] = Array.isArray(body?.linhas) ? body.linhas : [];
    if (linhas.length === 0) return json({ error: 'Nenhuma linha para importar.' }, { status: 400 });

    // Filtra apenas linhas importáveis
    const importaveis = linhas.filter((linha) =>
      isConciliacaoImportavel({ status: linha.status, descricao: linha.descricao })
    );

    if (importaveis.length === 0) {
      return json({ ok: true, importados: 0, ignorados: linhas.length, message: 'Nenhuma linha com status importável (BAIXA/OPFAX/ESTORNO).' });
    }

    // Busca registros existentes para deduplicação
    const chaves = importaveis.map((l) => buildImportKey(companyId, l.movimento_data, l.documento, l.descricao));
    const { data: existentes } = await client
      .from('conciliacao_recibos')
      .select('id, documento, movimento_data, descricao')
      .eq('company_id', companyId)
      .in('documento', importaveis.map((l) => l.documento))
      .limit(5000);

    const existentesKeys = new Set(
      (existentes || []).map((row: any) => buildImportKey(companyId, row.movimento_data, row.documento, row.descricao))
    );

    const novas = importaveis.filter((l) => !existentesKeys.has(buildImportKey(companyId, l.movimento_data, l.documento, l.descricao)));

    if (novas.length === 0) {
      return json({ ok: true, importados: 0, ignorados: linhas.length, duplicados: importaveis.length, message: 'Todos os registros já existem.' });
    }

    const rows = novas.map((l) => ({
      company_id: companyId,
      documento: String(l.documento || '').trim(),
      movimento_data: String(l.movimento_data || '').trim(),
      status: String(l.status || '').trim(),
      descricao: String(l.descricao || '').trim() || null,
      valor_lancamentos: l.valor_lancamentos ?? null,
      valor_taxas: l.valor_taxas ?? null,
      valor_descontos: l.valor_descontos ?? null,
      valor_abatimentos: l.valor_abatimentos ?? null,
      valor_nao_comissionavel: l.valor_nao_comissionavel ?? null,
      valor_calculada_loja: l.valor_calculada_loja ?? null,
      valor_visao_master: l.valor_visao_master ?? null,
      valor_opfax: l.valor_opfax ?? null,
      valor_saldo: l.valor_saldo ?? null,
      valor_venda_real: l.valor_venda_real ?? null,
      valor_comissao_loja: l.valor_comissao_loja ?? null,
      percentual_comissao_loja: l.percentual_comissao_loja ?? null,
      faixa_comissao: l.faixa_comissao ?? null,
      is_seguro_viagem: Boolean(l.is_seguro_viagem),
      origem: String(l.origem || 'manual').trim(),
      conciliado: false
    }));

    const BATCH = 100;
    let importados = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error: insertError } = await client.from('conciliacao_recibos').insert(batch);
      if (insertError) throw insertError;
      importados += batch.length;
    }

    return json({
      ok: true,
      importados,
      ignorados: linhas.length - importaveis.length,
      duplicados: importaveis.length - novas.length
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao importar conciliação.');
  }
}
