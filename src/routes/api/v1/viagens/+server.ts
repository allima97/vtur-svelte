import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse,
  getMonthRange,
  toISODateLocal
} from '$lib/server/v1';

function getPeriodoFilter(periodo: string | null): { from?: string; to?: string } | null {
  if (!periodo) return null;

  const hoje = new Date();
  const hojeStr = toISODateLocal(hoje);

  switch (periodo) {
    case 'hoje': {
      return { from: hojeStr, to: hojeStr };
    }
    case 'semana': {
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      return { from: toISODateLocal(inicioSemana), to: toISODateLocal(fimSemana) };
    }
    case 'mes': {
      const { inicio, fim } = getMonthRange(hoje);
      return { from: inicio, to: fim };
    }
    case 'proximos_30': {
      const fim = new Date(hoje);
      fim.setDate(hoje.getDate() + 30);
      return { from: hojeStr, to: toISODateLocal(fim) };
    }
    default:
      return null;
  }
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['viagens', 'operacao'], 1, 'Sem acesso a Viagens.');
    }

    const { searchParams } = event.url;
    const status = searchParams.get('status');
    const periodo = searchParams.get('periodo');
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('empresa_id'));
    const requestedResponsavelRaw =
      searchParams.get('responsavel_ids') ||
      searchParams.get('responsavel_id') ||
      searchParams.get('vendedor_ids') ||
      searchParams.get('vendedor_id');
    const scopedResponsavelIds = await resolveScopedVendedorIds(client, scope, requestedResponsavelRaw);

    // ✅ Guard: gestor/master sem empresa identificada não lista nada
    if (!scope.isAdmin && (scope.isGestor || scope.isMaster) && companyIds.length === 0) {
      return json({ items: [], total: 0 });
    }

    const effectiveResponsavelIds = !scope.isAdmin
      ? scope.isGestor || scope.isMaster
        ? scopedResponsavelIds
        : [user.id]
      : scopedResponsavelIds;

    let vendaIdsByResponsavel: string[] = [];
    if (effectiveResponsavelIds.length > 0) {
      let vendasQuery = client
        .from('vendas')
        .select('id')
        .in('vendedor_id', effectiveResponsavelIds)
        .limit(5000);

      if (companyIds.length > 0) {
        vendasQuery = vendasQuery.in('company_id', companyIds);
      }

      const { data: vendasByResponsavel } = await vendasQuery;
      vendaIdsByResponsavel = (vendasByResponsavel || [])
        .map((row: any) => String(row?.id || '').trim())
        .filter(Boolean);
    }

    let clienteIdsByResponsavel: string[] = [];
    if (effectiveResponsavelIds.length > 0) {
      const clienteIds = new Set<string>();

      // Clientes relacionados a vendas do vendedor/equipe
      let clientesViaVendasQuery = client
        .from('vendas')
        .select('cliente_id')
        .in('vendedor_id', effectiveResponsavelIds)
        .not('cliente_id', 'is', null)
        .limit(5000);
      if (companyIds.length > 0) {
        clientesViaVendasQuery = clientesViaVendasQuery.in('company_id', companyIds);
      }
      const { data: clientesViaVendas } = await clientesViaVendasQuery;
      (clientesViaVendas || []).forEach((row: any) => {
        const id = String(row?.cliente_id || '').trim();
        if (id) clienteIds.add(id);
      });

      // Clientes criados pelo vendedor/equipe (fallback para viagens sem venda vinculada)
      let clientesCriadosQuery = client
        .from('clientes')
        .select('id')
        .in('created_by', effectiveResponsavelIds)
        .limit(5000);
      if (companyIds.length > 0) {
        clientesCriadosQuery = clientesCriadosQuery.in('company_id', companyIds);
      }
      const { data: clientesCriados, error: clientesCriadosError } = await clientesCriadosQuery;
      if (!clientesCriadosError) {
        (clientesCriados || []).forEach((row: any) => {
          const id = String(row?.id || '').trim();
          if (id) clienteIds.add(id);
        });
      }

      clienteIdsByResponsavel = Array.from(clienteIds);
    }

    let query = client
      .from('viagens')
      .select(`
        id,
        venda_id,
        orcamento_id,
        cliente_id,
        company_id,
        responsavel_user_id,
        origem,
        destino,
        data_inicio,
        data_fim,
        status,
        observacoes,
        follow_up_text,
        follow_up_fechado,
        recibo_id,
        created_at,
        updated_at
      `)
      .order('data_inicio', { ascending: true })
      .limit(1000);

    const normalizedStatus = String(status || '').trim().toLowerCase();
    if (normalizedStatus && normalizedStatus !== 'todas') {
      if (normalizedStatus === 'programada') {
        query = query.in('status', ['planejada', 'programada', 'confirmada']);
      } else if (normalizedStatus === 'em_andamento') {
        query = query.in('status', ['em_andamento', 'em_viagem']);
      } else {
        query = query.eq('status', normalizedStatus);
      }
    }

    if (companyIds.length > 0) {
      query = query.in('company_id', companyIds);
    }

    const periodoFilter = getPeriodoFilter(periodo);
    if (periodoFilter?.from && periodoFilter?.to) {
      query = query
        .gte('data_inicio', periodoFilter.from)
        .lte('data_inicio', periodoFilter.to + 'T23:59:59');
    }

    const { data, error } = await query;
    if (error) throw error;

    const shouldApplyScopeFilter = !scope.isAdmin || effectiveResponsavelIds.length > 0;
    const responsavelSet = new Set(effectiveResponsavelIds);
    const vendaSet = new Set(vendaIdsByResponsavel);
    const clienteSet = new Set(clienteIdsByResponsavel);

    const scopedData = shouldApplyScopeFilter
      ? (data || []).filter((row: any) => {
          const responsavelId = String(row?.responsavel_user_id || '').trim();
          const vendaId = String(row?.venda_id || '').trim();
          const clienteId = String(row?.cliente_id || '').trim();
          return (
            (responsavelId && responsavelSet.has(responsavelId)) ||
            (vendaId && vendaSet.has(vendaId)) ||
            (clienteId && clienteSet.has(clienteId))
          );
        })
      : (data || []);

    const clienteIds = [...new Set((scopedData || []).map((v: any) => v.cliente_id).filter(Boolean))];
    const clientesMap = new Map<string, string>();
    if (clienteIds.length > 0) {
      const { data: clientesData } = await client
        .from('clientes')
        .select('id, nome')
        .in('id', clienteIds);
      (clientesData || []).forEach((c: any) => clientesMap.set(c.id, c.nome));
    }

    const responsavelIds = [...new Set((scopedData || []).map((v: any) => v.responsavel_user_id).filter(Boolean))];
    const responsaveisMap = new Map<string, string>();
    if (responsavelIds.length > 0) {
      const { data: responsaveisData } = await client
        .from('users')
        .select('id, nome_completo')
        .in('id', responsavelIds);
      (responsaveisData || []).forEach((u: any) => responsaveisMap.set(u.id, u.nome_completo));
    }

    const viagemIds = (scopedData || []).map((v: any) => v.id);
    const passageirosCountMap = new Map<string, number>();
    if (viagemIds.length > 0) {
      const { data: passageirosData } = await client
        .from('viagem_passageiros')
        .select('viagem_id')
        .in('viagem_id', viagemIds);
      (passageirosData || []).forEach((p: any) => {
        passageirosCountMap.set(p.viagem_id, (passageirosCountMap.get(p.viagem_id) || 0) + 1);
      });
    }

    const vendaIds = [...new Set((scopedData || []).map((v: any) => v.venda_id).filter(Boolean))];
    const vendasMap = new Map<string, number>();
    if (vendaIds.length > 0) {
      const { data: vendasData } = await client
        .from('vendas')
        .select('id, valor_total')
        .in('id', vendaIds);
      (vendasData || []).forEach((v: any) => vendasMap.set(v.id, v.valor_total));
    }

    const internacionalKeywords = [
      'europa', 'asia', 'africa', 'oceania', 'américa do norte',
      'eua', 'canada', 'mexico', 'caribe', 'orlando', 'miami',
      'new york', 'paris', 'londres', 'italia', 'espanha', 'portugal'
    ];

    const items = (scopedData || []).map((row: any) => {
      const numPassageiros = passageirosCountMap.get(row.id) || 1;
      const valorVenda = row.venda_id ? (vendasMap.get(row.venda_id) || 0) : 0;
      const tipoViagem =
        row.destino &&
        internacionalKeywords.some((k) => row.destino.toLowerCase().includes(k))
          ? 'internacional'
          : 'nacional';

      return {
        id: row.id,
        venda_id: row.venda_id,
        orcamento_id: row.orcamento_id,
        cliente_id: row.cliente_id,
        cliente_nome: clientesMap.get(row.cliente_id) || 'Cliente não encontrado',
        destino: row.destino || row.origem || 'Destino não informado',
        origem: row.origem,
        data_inicio: row.data_inicio,
        data_fim: row.data_fim,
        status: row.status || 'planejada',
        observacoes: row.observacoes || '',
        follow_up_text: row.follow_up_text || '',
        follow_up_fechado: row.follow_up_fechado || false,
        recibo_id: row.recibo_id,
        numero_passageiros: numPassageiros,
        tipo_viagem: tipoViagem,
        valor_total: valorVenda,
        responsavel_nome: responsaveisMap.get(row.responsavel_user_id) || 'Não atribuído',
        created_at: row.created_at
      };
    });

    return json({ items, total: items.length });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar viagens.');
  }
}
