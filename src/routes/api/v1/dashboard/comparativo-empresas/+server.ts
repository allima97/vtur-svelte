import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  getMonthRange,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
} from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmpresaComparativoItem = {
  company_id: string;
  nome: string;
  totalVendas: number;
  qtdVendas: number;
  totalMeta: number;
  atingimentoPct: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BATCH = 100;

function chunks<T>(arr: T[], size = BATCH): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function toNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function companyLabel(row: any): string {
  return String(row?.nome_fantasia || row?.nome_empresa || 'Empresa').trim() || 'Empresa';
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user   = await requireAuthenticatedUser(event);
    const scope  = await resolveUserScope(client, user.id);

    const tipoNome = String(scope.tipoNome || '').toUpperCase();
    const isMaster = tipoNome.includes('MASTER');
    const isAdmin  = tipoNome.includes('ADMIN');

    if (!isMaster && !isAdmin) {
      return json({ error: 'Acesso restrito.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const { searchParams } = event.url;
    const { inicio: defInicio, fim: defFim } = getMonthRange();
    const inicio = String(searchParams.get('inicio') || defInicio).trim();
    const fim    = String(searchParams.get('fim')    || defFim).trim();

    const companyIds = resolveScopedCompanyIds(scope, null)
      .filter(id => id !== '00000000-0000-0000-0000-000000000000');

    if (companyIds.length === 0) {
      return json({ inicio, fim, empresas: [] }, { headers: DYNAMIC_READ_HEADERS });
    }

    // ── 1. Nomes das empresas ───────────────────────────────────────────────
    const empresaMap = new Map<string, string>();
    for (const batch of chunks(companyIds)) {
      const { data, error } = await client
        .from('companies')
        .select('id, nome_fantasia, nome_empresa')
        .in('id', batch)
        .limit(500);
      if (error) throw error;
      (data || []).forEach((r: any) => empresaMap.set(String(r.id), companyLabel(r)));
    }

    // ── 2. Vendas por empresa ───────────────────────────────────────────────
    // Usa a tabela `vendas_recibos` (recibos) com filtro de data do recibo (data_venda)
    // e join com `vendas` para obter company_id e verificar cancelamento.
    // PostgREST: select com relação + filtro por coluna da relação via !inner
    const vendasMap = new Map<string, { total: number; ids: Set<string> }>();

    for (const batch of chunks(companyIds)) {
      // Busca todas as vendas não canceladas da empresa no período por data_venda da venda
      // Filtramos pela data_venda da venda com margem de 60 dias para pegar recibos
      // com datas diferentes (conciliação), e depois refinamos pelos recibos no período exato.
      const margemInicio = inicio.slice(0, 7) + '-01'; // primeiro dia do mês de início
      const { data, error } = await client
        .from('vendas')
        .select(`
          id,
          company_id,
          recibos:vendas_recibos (
            id,
            venda_id,
            data_venda,
            valor_total
          )
        `)
        .in('company_id', batch)
        .eq('cancelada', false)
        .gte('data_venda', margemInicio)
        .lte('data_venda', fim)
        .limit(50000);

      if (error) throw error;

      for (const venda of (data || []) as any[]) {
        const cid = String(venda.company_id || '').trim();
        if (!cid) continue;

        const recibos: any[] = Array.isArray(venda.recibos) ? venda.recibos : [];

        // Filtra recibos no período
        const recibosNoPeriodo = recibos.filter((r: any) => {
          const d = String(r.data_venda || '');
          return d >= inicio && d <= fim;
        });

        if (recibosNoPeriodo.length === 0) continue;

        const entry = vendasMap.get(cid) ?? { total: 0, ids: new Set() };
        for (const r of recibosNoPeriodo) {
          entry.total += toNum(r.valor_total);
        }
        entry.ids.add(String(venda.id));
        vendasMap.set(cid, entry);
      }
    }

    // ── 3. Metas por empresa (via vendedores) ──────────────────────────────
    const vendedorCompanyMap = new Map<string, string>();
    for (const batch of chunks(companyIds)) {
      const { data, error } = await client
        .from('users')
        .select('id, company_id')
        .in('company_id', batch)
        .eq('active', true)
        .limit(5000);
      if (error) throw error;
      (data || []).forEach((r: any) =>
        vendedorCompanyMap.set(String(r.id), String(r.company_id))
      );
    }

    const metaMap = new Map<string, number>();
    const allVendedorIds = Array.from(vendedorCompanyMap.keys());
    if (allVendedorIds.length > 0) {
      for (const batch of chunks(allVendedorIds)) {
        const { data, error } = await client
          .from('metas_vendedor')
          .select('vendedor_id, meta_geral')
          .eq('ativo', true)
          .gte('periodo', inicio.slice(0, 7))
          .lte('periodo', fim.slice(0, 7))
          .in('vendedor_id', batch)
          .limit(2000);
        if (error) throw error;
        (data || []).forEach((r: any) => {
          const cid = vendedorCompanyMap.get(String(r.vendedor_id)) || '';
          if (!cid) return;
          metaMap.set(cid, (metaMap.get(cid) ?? 0) + toNum(r.meta_geral));
        });
      }
    }

    // ── 4. Montar resultado ────────────────────────────────────────────────
    const allCids = new Set([...companyIds, ...vendasMap.keys()]);
    const result: EmpresaComparativoItem[] = [];

    for (const cid of allCids) {
      if (cid === '00000000-0000-0000-0000-000000000000') continue;
      const v = vendasMap.get(cid);
      const totalVendas = v?.total ?? 0;
      const qtdVendas   = v?.ids.size ?? 0;
      const totalMeta   = metaMap.get(cid) ?? 0;
      const atingimentoPct = totalMeta > 0
        ? Math.round((totalVendas / totalMeta) * 1000) / 10
        : 0;
      result.push({
        company_id: cid,
        nome: empresaMap.get(cid) || 'Empresa',
        totalVendas,
        qtdVendas,
        totalMeta,
        atingimentoPct,
      });
    }

    result.sort((a, b) => b.totalVendas - a.totalVendas);

    return json({ inicio, fim, empresas: result }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar comparativo por empresa.');
  }
}
