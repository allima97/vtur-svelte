import { json } from '@sveltejs/kit';
import {
  getAdminClient,
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

export type MesBucket = {
  mes: number; // 1–12
  totalVendas: number;
  qtdVendas: number;
};

export type AnoEvolucao = {
  ano: number;
  meses: MesBucket[]; // always 12 items
  totalAno: number;
  qtdAno: number;
};

export type EvolucaoAnualResult = {
  anos: AnoEvolucao[];
  crescimentoYoY: Record<string, number | null>; // "2024->2025" -> pct or null
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

function emptyMeses(): MesBucket[] {
  return Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    totalVendas: 0,
    qtdVendas: 0,
  }));
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
    const isGestor = tipoNome.includes('GESTOR');

    if (!isMaster && !isGestor) {
      return json({ error: 'Acesso restrito.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const { searchParams } = event.url;

    // anos: comma-separated, e.g. "2024,2025,2026"
    const anosParam = String(searchParams.get('anos') || '').trim();
    const currentYear = new Date().getFullYear();
    const requestedAnos: number[] = anosParam
      ? anosParam
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n) && n >= 2018 && n <= currentYear + 1)
          .slice(0, 5)
      : [currentYear - 1, currentYear];

    if (requestedAnos.length === 0) {
      return json({ error: 'Nenhum ano válido informado.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    // company_id: MASTER pode filtrar por uma empresa específica
    const companyIdParam = searchParams.get('company_id') || null;

    // Resolve empresas acessíveis pelo scope
    let baseCompanyIds = resolveScopedCompanyIds(scope, null);

    // GESTOR usa somente sua própria empresa
    if (!isMaster && scope.companyId) {
      baseCompanyIds = [scope.companyId];
    }

    // MASTER pode filtrar por uma empresa
    const companyIdFilter =
      isMaster && companyIdParam && baseCompanyIds.includes(companyIdParam)
        ? companyIdParam
        : null;

    const effectiveCompanyIds = companyIdFilter ? [companyIdFilter] : baseCompanyIds;

    const cacheKey = buildReadModelCacheKey('dashboard:evolucao-anual', {
      userId: user.id,
      anos: [...requestedAnos].sort(),
      effectiveCompanyIds: [...effectiveCompanyIds].sort(),
    });

    const result = await getCachedReadModel<EvolucaoAnualResult>({
      key: cacheKey,
      ttlMs: 120_000,
      staleTtlMs: 600_000,
      tags: [
        READ_MODEL_TAGS.dashboard,
        READ_MODEL_TAGS.sales,
        ...scopeCacheTags({ companyIds: effectiveCompanyIds, userId: user.id }),
      ],
      loader: async () => {
        // Buscar todos os vendedores das empresas no escopo
        const vendedorCompanyMap = new Map<string, string>();
        if (effectiveCompanyIds.length > 0) {
          for (const batch of chunkArray(effectiveCompanyIds)) {
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

        // Para cada ano, agregar vendas por mês
        const anosMap = new Map<number, MesBucket[]>();
        for (const ano of requestedAnos) {
          anosMap.set(ano, emptyMeses());
        }

        // Buscar contributions para o intervalo total (primeiro dia do menor ano ao último dia do maior ano)
        const anosOrdenados = [...requestedAnos].sort();
        const dataInicio = `${anosOrdenados[0]}-01-01`;
        const dataFim = `${anosOrdenados[anosOrdenados.length - 1]}-12-31`;

        const { contributions } = await fetchVendasKpiReciboContributionsRaw(client, {
          dataInicio,
          dataFim,
          companyIds: effectiveCompanyIds,
          vendedorIds: allVendedorIds,
          accessibleClientIds: [],
        });

        // Aggregate using Sets for deduplication of qtdVendas
        const totalVendasMap = new Map<string, number>(); // "ano-mes" -> totalVendas
        const vendaKeySets = new Map<string, Set<string>>(); // "ano-mes" -> Set<vendaKey>

        for (const c of contributions) {
          const bruto = toNum(c.bruto);
          if (bruto <= 0) continue;

          // Use reciboDate (format: "YYYY-MM-DD" or "YYYY-MM")
          const rawDate = String(c.reciboDate || '').trim();
          if (!rawDate || rawDate.length < 7) continue;

          const ano = parseInt(rawDate.slice(0, 4), 10);
          const mes = parseInt(rawDate.slice(5, 7), 10);

          if (!anosMap.has(ano) || mes < 1 || mes > 12) continue;

          const bucketKey = `${ano}-${mes}`;
          totalVendasMap.set(bucketKey, (totalVendasMap.get(bucketKey) ?? 0) + bruto);

          if (c.vendaKey) {
            if (!vendaKeySets.has(bucketKey)) vendaKeySets.set(bucketKey, new Set());
            vendaKeySets.get(bucketKey)!.add(c.vendaKey);
          }
        }

        // Apply aggregated values
        for (const [ano, meses] of anosMap.entries()) {
          for (const bucket of meses) {
            const bucketKey = `${ano}-${bucket.mes}`;
            bucket.totalVendas = totalVendasMap.get(bucketKey) ?? 0;
            bucket.qtdVendas = vendaKeySets.get(bucketKey)?.size ?? 0;
          }
        }

        // Build output
        const anos: AnoEvolucao[] = requestedAnos.map((ano) => {
          const meses = anosMap.get(ano) || emptyMeses();
          const totalAno = meses.reduce((sum, m) => sum + m.totalVendas, 0);
          const qtdAno = meses.reduce((sum, m) => sum + m.qtdVendas, 0);
          return { ano, meses, totalAno, qtdAno };
        });

        // Calculate YoY growth
        const crescimentoYoY: Record<string, number | null> = {};
        for (let i = 1; i < anos.length; i++) {
          const prev = anos[i - 1];
          const curr = anos[i];
          const key = `${prev.ano}->${curr.ano}`;
          if (prev.totalAno > 0) {
            crescimentoYoY[key] = Math.round(((curr.totalAno - prev.totalAno) / prev.totalAno) * 1000) / 10;
          } else {
            crescimentoYoY[key] = null;
          }
        }

        return { anos, crescimentoYoY };
      },
    });

    return json(
      {
        anos: requestedAnos,
        empresaFiltro: companyIdFilter,
        data: result,
      },
      { headers: DYNAMIC_READ_HEADERS },
    );
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar evolução anual de vendas.');
  }
}
