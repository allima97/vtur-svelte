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
import { toFiniteNumber as toNum } from '$lib/utils/values';

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

type CompanyRow = {
  id: string | null;
  nome_fantasia: string | null;
  nome_empresa: string | null;
};

type VendaComparativoRow = {
  id: string | null;
  company_id: string | null;
  recibos?: Array<{
    id?: string | null;
    valor_total?: number | string | null;
  }> | null;
};

type VendedorCompanyRow = {
  id: string | null;
  company_id: string | null;
};

type MetaVendedorRow = {
  vendedor_id: string | null;
  meta_geral: number | string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BATCH = 100;
const PAGE  = 1000;

function chunks<T>(arr: T[], size = BATCH): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < arr.length; i += size) r.push(arr.slice(i, i + size));
  return r;
}

function companyLabel(row: CompanyRow): string {
  return String(row?.nome_fantasia || row?.nome_empresa || 'Empresa').trim() || 'Empresa';
}

const NO_MATCH = '00000000-0000-0000-0000-000000000000';

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

    const companyIds = resolveScopedCompanyIds(scope, null).filter(id => id !== NO_MATCH);

    if (companyIds.length === 0) {
      return json({ inicio, fim, empresas: [] }, { headers: DYNAMIC_READ_HEADERS });
    }

    // ── 1. Nomes das empresas ──────────────────────────────────────────────
    const empresaMap = new Map<string, string>();
    for (const batch of chunks(companyIds)) {
      const { data, error } = await client
        .from('companies')
        .select('id, nome_fantasia, nome_empresa')
        .in('id', batch)
        .limit(500);
      if (error) throw error;
      for (const row of data || []) {
        empresaMap.set(String(row.id), companyLabel(row as CompanyRow));
      }
    }

    // ── 2. Vendas por empresa ──────────────────────────────────────────────
    // Usa exatamente o mesmo padrão do fetchSalesReportRows (relatorios.ts):
    //   - tabela: vendas
    //   - join:   recibos:vendas_recibos!inner  (só vendas que têm recibo no período)
    //   - filtro: recibos.data_venda  (alias PostgREST)
    //   - filtro: company_id IN (...)
    //   - filtro: cancelada = false
    const vendasMap = new Map<string, { total: number; ids: Set<string> }>();

    for (const batch of chunks(companyIds)) {
      let offset = 0;
      while (true) {
        const { data, error } = await client
          .from('vendas')
          .select(`
            id,
            company_id,
            recibos:vendas_recibos!inner (
              id,
              valor_total
            )
          `)
          .in('company_id', batch)
          .eq('cancelada', false)
          .gte('recibos.data_venda', inicio)
          .lte('recibos.data_venda', fim)
          .range(offset, offset + PAGE - 1);

        if (error) throw error;

        const rows = (data || []) as VendaComparativoRow[];

        for (const venda of rows) {
          const cid = String(venda.company_id || '').trim();
          if (!cid || cid === NO_MATCH) continue;

          const recibos = Array.isArray(venda.recibos) ? venda.recibos : [];
          const totalRecibos = recibos.reduce((s, r) => s + toNum(r.valor_total), 0);
          if (totalRecibos <= 0) continue;

          const entry = vendasMap.get(cid) ?? { total: 0, ids: new Set<string>() };
          entry.total += totalRecibos;
          entry.ids.add(String(venda.id));
          vendasMap.set(cid, entry);
        }

        if (rows.length < PAGE) break;
        offset += PAGE;
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
      for (const row of (data || []) as VendedorCompanyRow[]) {
        vendedorCompanyMap.set(String(row.id), String(row.company_id));
      }
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
        for (const row of (data || []) as MetaVendedorRow[]) {
          const cid = vendedorCompanyMap.get(String(row.vendedor_id)) || '';
          if (!cid) continue;
          metaMap.set(cid, (metaMap.get(cid) ?? 0) + toNum(row.meta_geral));
        }
      }
    }

    // ── 4. Montar resultado ────────────────────────────────────────────────
    const allCids = new Set([...companyIds, ...vendasMap.keys()]);
    const result: EmpresaComparativoItem[] = [];

    for (const cid of allCids) {
      if (cid === NO_MATCH) continue;
      const v             = vendasMap.get(cid);
      const totalVendas   = v?.total ?? 0;
      const qtdVendas     = v?.ids.size ?? 0;
      const totalMeta     = metaMap.get(cid) ?? 0;
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
