import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  getMonthRange,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
} from '$lib/server/v1';
import { fetchVendasKpiReciboContributionsRaw } from '$lib/server/vendas-kpis';
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from '$lib/server/readModelCache';
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

const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

function toNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function companyLabel(row: any): string {
  return String(row?.nome_fantasia || row?.nome_empresa || 'Empresa').trim() || 'Empresa';
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const tipoNome = String(scope.tipoNome || '').toUpperCase();
    const isMaster = tipoNome.includes('MASTER');
    const isAdmin = tipoNome.includes('ADMIN');

    // Apenas MASTER e ADMIN têm acesso a este endpoint
    if (!isMaster && !isAdmin) {
      return json({ error: 'Acesso restrito.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const { searchParams } = event.url;
    const { inicio: defaultInicio, fim: defaultFim } = getMonthRange();
    const inicio = String(searchParams.get('inicio') || defaultInicio).trim();
    const fim = String(searchParams.get('fim') || defaultFim).trim();

    const companyIds = resolveScopedCompanyIds(scope, null);

    const cacheKey = buildReadModelCacheKey('dashboard:comparativo-empresas', {
      userId: user.id,
      inicio,
      fim,
      companyIds: [...companyIds].sort(),
    });

    const result = await getCachedReadModel<EmpresaComparativoItem[]>({
      key: cacheKey,
      ttlMs: 60_000,
      staleTtlMs: 300_000,
      tags: [
        READ_MODEL_TAGS.dashboard,
        READ_MODEL_TAGS.sales,
        READ_MODEL_TAGS.metas,
        READ_MODEL_TAGS.users,
        ...scopeCacheTags({ companyIds, userId: user.id }),
      ],
      loader: async () => {
        // 1. Buscar nomes das empresas
        const empresaMap = new Map<string, string>();
        if (companyIds.length > 0) {
          for (const batch of chunkArray(companyIds)) {
            const { data, error } = await client
              .from('companies')
              .select('id, nome_fantasia, nome_empresa')
              .in('id', batch)
              .limit(500);
            if (error) throw error;
            (data || []).forEach((row: any) => {
              empresaMap.set(String(row.id), companyLabel(row));
            });
          }
        }

        // 2. Buscar vendedores de cada empresa (vendedor_id → company_id)
        const vendedorCompanyMap = new Map<string, string>();
        if (companyIds.length > 0) {
          for (const batch of chunkArray(companyIds)) {
            const { data, error } = await client
              .from('users')
              .select('id, company_id')
              .in('company_id', batch)
              .eq('active', true)
              .limit(5000);
            if (error) throw error;
            (data || []).forEach((row: any) => {
              vendedorCompanyMap.set(String(row.id), String(row.company_id));
            });
          }
        }

        const allVendedorIds = Array.from(vendedorCompanyMap.keys());

        // 3. Agregar vendas por empresa via contributions
        const { contributions } = await fetchVendasKpiReciboContributionsRaw(client, {
          dataInicio: inicio,
          dataFim: fim,
          companyIds,
          vendedorIds: allVendedorIds,
          accessibleClientIds: [],
        });

        // Mapas: company_id → { totalVendas, qtdVendas (unique vendaKeys) }
        const vendasMap = new Map<string, { totalVendas: number; vendaKeys: Set<string> }>();

        for (const c of contributions) {
          const bruto = toNum(c.bruto);
          if (bruto <= 0) continue;

          // companyId já está na contribution — usa direto
          const cid = String(c.companyId || vendedorCompanyMap.get(String(c.vendedorId || '')) || '').trim();
          if (!cid) continue;

          const entry = vendasMap.get(cid) ?? { totalVendas: 0, vendaKeys: new Set() };
          entry.totalVendas += bruto;
          if (c.vendaKey) entry.vendaKeys.add(c.vendaKey);
          vendasMap.set(cid, entry);
        }

        // 4. Buscar metas por empresa (via join vendedor_id → company_id)
        const metaMap = new Map<string, number>();

        if (allVendedorIds.length > 0) {
          for (const batch of chunkArray(allVendedorIds)) {
            const { data, error } = await client
              .from('metas_vendedor')
              .select('vendedor_id, meta_geral, periodo, ativo')
              .eq('ativo', true)
              .gte('periodo', inicio.slice(0, 7))
              .lte('periodo', fim.slice(0, 7))
              .in('vendedor_id', batch)
              .limit(2000);
            if (error) throw error;
            (data || []).forEach((row: any) => {
              const vid = String(row.vendedor_id || '');
              const cid = vendedorCompanyMap.get(vid) || '';
              if (!cid) return;
              metaMap.set(cid, (metaMap.get(cid) ?? 0) + toNum(row.meta_geral));
            });
          }
        }

        // 5. Montar resultado por empresa
        const result: EmpresaComparativoItem[] = [];

        const allCompanyIds = new Set([
          ...companyIds,
          ...vendasMap.keys(),
        ]);

        for (const cid of allCompanyIds) {
          const vendas = vendasMap.get(cid);
          const totalVendas = vendas?.totalVendas ?? 0;
          const qtdVendas = vendas?.vendaKeys.size ?? 0;
          const totalMeta = metaMap.get(cid) ?? 0;
          const atingimentoPct = totalMeta > 0 ? Math.round((totalVendas / totalMeta) * 1000) / 10 : 0;
          const nome = empresaMap.get(cid) || 'Empresa';

          result.push({ company_id: cid, nome, totalVendas, qtdVendas, totalMeta, atingimentoPct });
        }

        return result.sort((a, b) => b.totalVendas - a.totalVendas);
      },
    });

    return json({ inicio, fim, empresas: result }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar comparativo por empresa.');
  }
}
