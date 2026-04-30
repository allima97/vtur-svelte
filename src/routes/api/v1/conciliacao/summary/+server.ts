import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { diagnosticarLacunasCronologicas } from '$lib/server/conciliacaoReconcile';

function isConciliacaoEfetivada(row: any) {
  const raw = String(row?.descricao || row?.status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  return raw.includes('BAIXA');
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 1, 'Sem acesso à Conciliação.');
    }

    const { searchParams } = event.url;
    const mes = String(searchParams.get('mes') || '').trim(); // YYYY-MM
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('company_id'));

    // Não-admins devem sempre ter empresa resolvida
    if (!scope.isAdmin && companyIds.length === 0) {
      return json({ error: 'Empresa não identificada.' }, { status: 400 });
    }
    // Admin sem filtro explicitamente passado também precisa de company_id
    if (companyIds.length === 0) {
      return json({ error: 'Informe company_id.' }, { status: 400 });
    }

    const inicio = mes
      ? `${mes}-01`
      : (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        })();

    const fim = mes
      ? (() => {
          const [y, m] = mes.split('-').map(Number);
          return new Date(y, m, 0).toISOString().slice(0, 10);
        })()
      : new Date().toISOString().slice(0, 10);

    // companyId primário para diagnóstico cronológico (usa o primeiro do escopo)
    const companyIdDiag = companyIds[0];

    const [queryResult, diagnostico] = await Promise.all([
      client
        .from('conciliacao_recibos')
        .select(
          'id, movimento_data, status, descricao, conciliado, venda_id, ranking_vendedor_id, valor_calculada_loja, valor_lancamentos, is_baixa_rac'
        )
        .in('company_id', companyIds)
        .gte('movimento_data', inicio)
        .lte('movimento_data', fim)
        .limit(5000),
      companyIdDiag
        ? diagnosticarLacunasCronologicas({ client, companyId: companyIdDiag })
        : Promise.resolve(null)
    ]);

    if (queryResult.error) throw queryResult.error;

    const rows = queryResult.data || [];
    const efetivados = rows.filter((row: any) => isConciliacaoEfetivada(row));
    const pendentes = efetivados.filter((row: any) => !row.conciliado);
    const semRanking = efetivados.filter((row: any) => !row.venda_id && !row.ranking_vendedor_id);
    const baixaRac = rows.filter((row: any) => row.is_baixa_rac);

    const totalValor = efetivados.reduce(
      (acc: number, row: any) => acc + Number(row.valor_calculada_loja || row.valor_lancamentos || 0),
      0
    );

    const byDay = new Map<string, number>();
    efetivados.forEach((row: any) => {
      const day = String(row.movimento_data || '').slice(0, 10);
      if (day) byDay.set(day, (byDay.get(day) || 0) + Number(row.valor_calculada_loja || row.valor_lancamentos || 0));
    });

    const timeline = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));

    // Monta alerta de bloqueio cronológico (apenas se houver lacunas)
    const lacunaCronologica = diagnostico && diagnostico.diasFaltantes.length > 0
      ? {
          fronteira: diagnostico.fronteira,
          dias_faltantes: diagnostico.diasFaltantes,
          dias_bloqueados: diagnostico.diasBloqueados,
          registros_bloqueados: diagnostico.registrosBloqueados,
          aviso: `A conciliação está bloqueada a partir de ${diagnostico.fronteira}. ` +
            `Importe os arquivos dos dias: ${diagnostico.diasFaltantes.map(d => {
              const [y, m, dia] = d.split('-');
              return `${dia}/${m}/${y}`;
            }).join(', ')} ` +
            `para liberar ${diagnostico.registrosBloqueados} registro(s) bloqueado(s).`
        }
      : null;

    return json({
      periodo: { inicio, fim },
      total: rows.length,
      efetivados: efetivados.length,
      pendentes: pendentes.length,
      semRanking: semRanking.length,
      baixaRac: baixaRac.length,
      totalValor,
      timeline,
      ...(lacunaCronologica ? { lacuna_cronologica: lacunaCronologica } : {})
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar resumo da conciliação.');
  }
}
