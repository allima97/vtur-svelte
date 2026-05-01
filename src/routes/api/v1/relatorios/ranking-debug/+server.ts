/**
 * Endpoint de diagnóstico e correção de recibos problemáticos da conciliação.
 *
 * GET  /api/v1/relatorios/ranking-debug?docs=084185,083862,084186
 *      → Lista linhas da conciliação com vendedor atribuído e valores
 *
 * POST /api/v1/relatorios/ranking-debug
 *      Body: { action: "fix_vendor", id: "<uuid>", vendedor_id: "<uuid>" }
 *      → Atualiza ranking_vendedor_id do registro
 *
 *      Body: { action: "fix_valor", id: "<uuid>", valor_lancamentos: 18148, valor_venda_real: 18148 }
 *      → Atualiza valor_lancamentos e valor_venda_real do registro
 *
 * REMOVER após correções.
 */
import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  toErrorResponse,
} from '$lib/server/v1';
import { findEquipeVturVendedor } from '$lib/conciliacao/baixaRac';

export async function GET(event) {
  try {
    const client = getAdminClient();
    await requireAuthenticatedUser(event);

    // Modo diagnóstico por vendedor: ?vendedor=Leonardo&mes=2026-04
    const vendedorBusca = event.url.searchParams.get('vendedor');
    const mesBusca = event.url.searchParams.get('mes') || '2026-04';
    if (vendedorBusca) {
      const [ano, mes] = mesBusca.split('-');
      const inicio = `${ano}-${mes}-01`;
      const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
      const fim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;

      // 1. Encontrar o(s) user(s) com esse nome
      const { data: usersData } = await client
        .from('users')
        .select('id, nome_completo')
        .ilike('nome_completo', `%${vendedorBusca}%`)
        .limit(5);
      const userIds = (usersData || []).map((u: any) => u.id);
      const userNomes: Record<string, string> = Object.fromEntries((usersData || []).map((u: any) => [u.id, u.nome_completo]));

      if (userIds.length === 0) return json({ erro: `Nenhum usuário encontrado com nome "${vendedorBusca}"` });

      // 2. Buscar todos os registros de conciliação atribuídos a esse(s) vendedor(es)
      const { data: concRows, error: concErr } = await client
        .from('conciliacao_recibos')
        .select('id, documento, status, descricao, movimento_data, valor_lancamentos, valor_venda_real, valor_taxas, valor_descontos, valor_abatimentos, valor_nao_comissionavel, is_seguro_viagem, faixa_comissao, ranking_vendedor_id, company_id')
        .in('ranking_vendedor_id', userIds)
        .gte('movimento_data', inicio)
        .lte('movimento_data', fim)
        .order('movimento_data', { ascending: true });
      if (concErr) throw concErr;

      // Agrupa por documento (dedup — pega o mais recente por documento, ignora ESTORNO)
      const docMapVendedor = new Map<string, any>();
      for (const r of (concRows || [])) {
        const doc = String(r.documento || '').trim();
        const status = String(r.status || '').toUpperCase();
        if (!doc) continue;
        const existing = docMapVendedor.get(doc);
        if (!existing) {
          docMapVendedor.set(doc, { ...r, _estornado: status === 'ESTORNO' });
        } else {
          if (status === 'ESTORNO') existing._estornado = true;
        }
      }
      const recibosVendedor = Array.from(docMapVendedor.values()).filter(r => !r._estornado);

      const calcBruto = (r: any) => {
        const lanc = Number(r.valor_lancamentos || 0);
        const desc = Number(r.valor_descontos || 0);
        const abat = Number(r.valor_abatimentos || 0);
        const naoC = Math.max(0, Number(r.valor_nao_comissionavel || 0));
        return Math.max(0, lanc - desc - abat - naoC);
      };
      const isSeguro = (r: any) => Boolean(r.is_seguro_viagem) || ['SEGURO_32_35', 'SEGURO_35_38'].includes(String(r.faixa_comissao || ''));

      const totalBruto = recibosVendedor.reduce((s: number, r: any) => s + calcBruto(r), 0);
      const totalSeguro = recibosVendedor.filter(isSeguro).reduce((s: number, r: any) => s + calcBruto(r), 0);
      const totalReal = recibosVendedor.reduce((s: number, r: any) => s + Number(r.valor_venda_real || 0), 0);

      // 3. Buscar também registros onde o documento aparece mas está atribuído a OUTRO vendedor
      // — para detectar se recibos que deveriam ser do Leonardo foram para o Márcio
      // Primeiro pegar os documentos das vendas do usuário via vendas_recibos
      const { data: vendasRows } = await client
        .from('vendas')
        .select('id, vendedor_id, vendas_recibos(id, numero_recibo, data_venda)')
        .in('vendedor_id', userIds)
        .gte('created_at', `${inicio}T00:00:00`)
        .lte('created_at', `${fim}T23:59:59`)
        .limit(200);

      const docsDasVendas: string[] = [];
      for (const v of (vendasRows || [])) {
        for (const r of ((v as any).vendas_recibos || [])) {
          if (r.numero_recibo) docsDasVendas.push(String(r.numero_recibo));
        }
      }

      // 4. Para esses documentos, ver quem está atribuído na conciliação
      let concAtribuicaoOutros: any[] = [];
      if (docsDasVendas.length > 0) {
        const { data: outrosRows } = await client
          .from('conciliacao_recibos')
          .select('id, documento, status, descricao, movimento_data, valor_lancamentos, valor_venda_real, ranking_vendedor_id')
          .in('documento', docsDasVendas)
          .gte('movimento_data', inicio)
          .lte('movimento_data', fim)
          .not('ranking_vendedor_id', 'in', `(${userIds.join(',')})`)
          .limit(100);
        // Resolver nomes dos outros vendedores
        const outrosIds = [...new Set((outrosRows || []).map((r: any) => r.ranking_vendedor_id).filter(Boolean))];
        const { data: outrosUsers } = outrosIds.length > 0
          ? await client.from('users').select('id, nome_completo').in('id', outrosIds)
          : { data: [] };
        const outrosNomes: Record<string, string> = Object.fromEntries((outrosUsers || []).map((u: any) => [u.id, u.nome_completo]));
        concAtribuicaoOutros = (outrosRows || []).map((r: any) => ({
          ...r,
          ranking_vendedor_nome: outrosNomes[r.ranking_vendedor_id] || r.ranking_vendedor_id || '(sem vendedor)',
        }));
      }

      return json({
        vendedor_buscado: vendedorBusca,
        periodo: `${inicio} a ${fim}`,
        usuarios_encontrados: usersData,
        total_bruto_conciliacao: Math.round(totalBruto * 100) / 100,
        total_seguro_conciliacao: Math.round(totalSeguro * 100) / 100,
        total_real_conciliacao: Math.round(totalReal * 100) / 100,
        recibos_atribuidos_ao_vendedor: recibosVendedor.map((r: any) => ({
          id: r.id,
          documento: r.documento,
          status: r.status,
          movimento_data: r.movimento_data,
          valor_lancamentos: r.valor_lancamentos,
          valor_descontos: r.valor_descontos,
          valor_abatimentos: r.valor_abatimentos,
          valor_nao_comissionavel: r.valor_nao_comissionavel,
          valor_bruto_calculado: Math.round(calcBruto(r) * 100) / 100,
          valor_taxas: r.valor_taxas,
          is_seguro: isSeguro(r),
          ranking_vendedor_id: r.ranking_vendedor_id,
          ranking_vendedor_nome: userNomes[r.ranking_vendedor_id] || r.ranking_vendedor_id,
          company_id: r.company_id,
        })),
        possiveis_recibos_desviados: concAtribuicaoOutros,
        resumo: {
          atribuidos_unicos: recibosVendedor.length,
          possiveis_desvios: concAtribuicaoOutros.length,
        }
      });
    }

    // Modo listagem de descrições distintas no banco: ?descricoes=1
    const listarDescricoes = event.url.searchParams.get('descricoes');
    if (listarDescricoes) {
      const companyId = event.url.searchParams.get('empresa_id');
      let q = client
        .from('conciliacao_recibos')
        .select('descricao, status')
        .limit(2000);
      if (companyId) q = q.eq('company_id', companyId);
      const { data: descRows, error: descErr } = await q;
      if (descErr) throw descErr;
      // Agrupa por (descricao, status) com contagem
      const counts = new Map<string, number>();
      for (const r of (descRows || [])) {
        const key = `${r.status}||${r.descricao || ''}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const result = Array.from(counts.entries())
        .map(([key, count]) => {
          const [status, descricao] = key.split('||');
          return { status, descricao, count };
        })
        .sort((a, b) => b.count - a.count);
      return json({ descricoes_distintas: result, total_linhas: descRows?.length });
    }

    // Modo busca de usuário: ?busca_usuario=Sandra
    const buscaUsuario = event.url.searchParams.get('busca_usuario');
    if (buscaUsuario) {
      const { data: usuarios, error: userErr } = await client
        .from('users')
        .select('id, nome_completo')
        .ilike('nome_completo', `%${buscaUsuario}%`)
        .limit(10);
      if (userErr) throw userErr;
      return json({ usuarios: usuarios || [] });
    }

    // ── Modo auditoria por mês: ?auditoria_mes=2026-04&empresa_id=<uuid> ──
    // Retorna totais brutos da conciliação por vendedor (com e sem vendor) + recibos sem vendedor
    const auditoriaMes = event.url.searchParams.get('auditoria_mes');
    if (auditoriaMes) {
      const [ano, mes] = String(auditoriaMes).split('-');
      const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
      const inicio = `${ano}-${mes}-01`;
      const fim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
      const empresaId = event.url.searchParams.get('empresa_id');

      // Metas informadas (valores de fechamento externos)
      const metasExternas: Record<string, number> = {
        'LAZARO':    430121.61,
        'MARCIO':    367805.28,
        'LEONARDO':  326281.57,
        'ANDERSON':  235824.53,
        'ANDRE':     209151.28,
        'TATIANA':   117471.10,
        'SANDRA':    117639.55,
      };

      // 1. Buscar todos os recibos de conciliação do período
      let concQ = client
        .from('conciliacao_recibos')
        .select('id, documento, movimento_data, valor_lancamentos, valor_venda_real, valor_taxas, valor_descontos, valor_abatimentos, valor_nao_comissionavel, ranking_vendedor_id, is_seguro_viagem, faixa_comissao, is_baixa_rac, status')
        .gte('movimento_data', inicio)
        .lte('movimento_data', fim)
        .neq('is_baixa_rac', true)
        .limit(5000);
      if (empresaId) concQ = concQ.eq('company_id', empresaId);
      const { data: concRows, error: concErr } = await concQ;
      if (concErr) throw concErr;

      // Agrupar por documento (pegar único por documento, somando estornos)
      const porDocumento = new Map<string, any>();
      for (const r of (concRows || [])) {
        const doc = String(r.documento || '').trim();
        if (!doc) continue;
        const status = String(r.status || '').toUpperCase();
        const existing = porDocumento.get(doc);
        if (!existing) {
          porDocumento.set(doc, { ...r, _estornado: status === 'ESTORNO' });
        } else {
          // Se houver ESTORNO, marca como estornado
          if (status === 'ESTORNO') existing._estornado = true;
        }
      }

      // Filtrar estornados e calcular valor_bruto para cada um
      const recibosAtivos: any[] = [];
      for (const r of porDocumento.values()) {
        if (r._estornado) continue;
        const lancamentos = Number(r.valor_lancamentos || 0);
        const descontos = Number(r.valor_descontos || 0);
        const abatimentos = Number(r.valor_abatimentos || 0);
        const naoComis = Math.max(0, Number(r.valor_nao_comissionavel || 0));
        const bruto = Math.max(0, lancamentos - descontos - abatimentos - naoComis);
        recibosAtivos.push({
          ...r,
          _bruto: bruto,
          _isSeguro: Boolean(r.is_seguro_viagem) ||
            ['SEGURO_32_35', 'SEGURO_35_38'].includes(String(r.faixa_comissao || ''))
        });
      }

      // 2. Resolver nomes dos vendedores
      const vendedorIdsSet = new Set<string>();
      for (const r of recibosAtivos) {
        if (r.ranking_vendedor_id) vendedorIdsSet.add(r.ranking_vendedor_id);
      }
      const nomesMap: Record<string, string> = {};
      const companyMap: Record<string, string> = {};
      const usoIndividualSet = new Set<string>();
      if (vendedorIdsSet.size > 0) {
        const { data: usersData } = await client
          .from('users')
          .select('id, nome_completo, company_id, active, uso_individual')
          .in('id', Array.from(vendedorIdsSet));
        for (const u of (usersData || [])) {
          nomesMap[u.id] = u.nome_completo || u.id;
          companyMap[u.id] = u.company_id || '';
          if (u.uso_individual || !u.active) usoIndividualSet.add(u.id);
        }
      }

      // 3. Agregar por vendedor
      const porVendedor: Record<string, { nome: string; total_bruto: number; total_seguro: number; qtd: number; recibos_sem_vendedor_bruto: number }> = {};
      let semVendedorBruto = 0;
      let semVendedorQtd = 0;
      let invalidVendedorBruto = 0;
      const semVendedorRecibos: any[] = [];

      for (const r of recibosAtivos) {
        const vid = String(r.ranking_vendedor_id || '').trim();
        const isInvalid = vid && usoIndividualSet.has(vid);
        if (!vid || isInvalid) {
          semVendedorBruto += r._bruto;
          semVendedorQtd++;
          if (isInvalid) {
            invalidVendedorBruto += r._bruto;
            semVendedorRecibos.push({
              documento: r.documento,
              bruto: r._bruto,
              motivo: 'uso_individual',
              ranking_vendedor_nome: nomesMap[vid] || vid
            });
          } else {
            semVendedorRecibos.push({
              documento: r.documento,
              bruto: r._bruto,
              motivo: 'sem_ranking_vendedor_id',
              movimento_data: r.movimento_data
            });
          }
          continue;
        }
        if (!porVendedor[vid]) {
          porVendedor[vid] = { nome: nomesMap[vid] || vid, total_bruto: 0, total_seguro: 0, qtd: 0, recibos_sem_vendedor_bruto: 0 };
        }
        porVendedor[vid].total_bruto += r._bruto;
        porVendedor[vid].qtd++;
        if (r._isSeguro) porVendedor[vid].total_seguro += r._bruto;
      }

      // 4. Comparar com metas externas
      const comparacao = Object.entries(porVendedor)
        .map(([vid, dados]) => {
          const primeiroNome = dados.nome.split(' ')[0].toUpperCase();
          // Tenta casar pelo primeiro nome
          let metaKey = Object.keys(metasExternas).find(k => primeiroNome.startsWith(k) || k.startsWith(primeiroNome));
          // Casos especiais
          if (primeiroNome === 'LAZARO' || primeiroNome === 'LÁZARO') metaKey = 'LAZARO';
          if (primeiroNome === 'MARCIO' || primeiroNome === 'MÁRCIO') metaKey = 'MARCIO';
          if (primeiroNome === 'ANDRE' || primeiroNome === 'ANDRÉ') metaKey = 'ANDRE';
          const metaExterna = metaKey ? metasExternas[metaKey] : null;
          const diferenca = metaExterna != null ? Math.round((dados.total_bruto - metaExterna) * 100) / 100 : null;
          return {
            vendedor_id: vid,
            nome: dados.nome,
            qtd_recibos: dados.qtd,
            total_bruto_conciliacao: Math.round(dados.total_bruto * 100) / 100,
            total_seguro_conciliacao: Math.round(dados.total_seguro * 100) / 100,
            meta_fechamento_externo: metaExterna,
            diferenca_bruta: diferenca,
            pct_diferenca: metaExterna != null && metaExterna > 0
              ? Math.round((diferenca! / metaExterna) * 10000) / 100
              : null
          };
        })
        .sort((a, b) => (b.total_bruto_conciliacao - a.total_bruto_conciliacao));

      return json({
        periodo: `${inicio} a ${fim}`,
        total_recibos_ativos: recibosAtivos.length,
        total_sem_vendedor: semVendedorQtd,
        total_bruto_sem_vendedor: Math.round(semVendedorBruto * 100) / 100,
        total_bruto_invalido_uso_individual: Math.round(invalidVendedorBruto * 100) / 100,
        por_vendedor: comparacao,
        recibos_sem_vendedor: semVendedorRecibos.slice(0, 100),
      });
    }

    const docsParam = event.url.searchParams.get('docs') || '084185,083862,084186';
    const docNumbers = docsParam.split(',').map((d) => d.trim()).filter(Boolean);

    // Monta variações do número: com e sem prefixo 5630-0000
    const docVariants: string[] = [];
    for (const doc of docNumbers) {
      docVariants.push(doc);
      docVariants.push(`5630-0000${doc}`);
    }

    // 1. Buscar linhas de conciliacao_recibos
    const { data: concRows, error: concErr } = await client
      .from('conciliacao_recibos')
      .select('id, documento, status, descricao, movimento_data, valor_lancamentos, valor_venda_real, venda_id, venda_recibo_id, ranking_vendedor_id, company_id')
      .in('documento', docVariants)
      .order('movimento_data', { ascending: true });
    if (concErr) throw concErr;

    // 2. Resolver nomes dos vendedores atribuídos
    const vendedorIdsToResolve = new Set<string>();
    (concRows || []).forEach((r: any) => {
      if (r.ranking_vendedor_id) vendedorIdsToResolve.add(r.ranking_vendedor_id);
    });
    const vendedorNomes: Record<string, string> = {};
    if (vendedorIdsToResolve.size > 0) {
      const { data: usersData } = await client
        .from('users')
        .select('id, nome_completo')
        .in('id', Array.from(vendedorIdsToResolve));
      (usersData || []).forEach((u: any) => {
        vendedorNomes[u.id] = u.nome_completo || u.id;
      });
    }

    const enrichedRows = (concRows || []).map((r: any) => ({
      ...r,
      ranking_vendedor_nome: vendedorNomes[r.ranking_vendedor_id] || r.ranking_vendedor_id || '(sem vendedor)',
    }));

    return json({
      docs_pesquisados: docVariants,
      conciliacao_rows: enrichedRows,
      resumo: {
        linhas_encontradas: enrichedRows.length,
      }
    });
  } catch (err) {
    console.error('[ranking-debug] Erro GET:', err);
    return toErrorResponse(err, 'Erro no diagnóstico do ranking.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    await requireAuthenticatedUser(event);

    const body = await event.request.json();
    const { action, id } = body;

    if (!id || typeof id !== 'string') {
      return json({ error: 'id é obrigatório' }, { status: 400 });
    }

    if (action === 'fix_vendor') {
      const { vendedor_id } = body;
      if (!vendedor_id) return json({ error: 'vendedor_id é obrigatório' }, { status: 400 });

      // Nunca permitir atribuição de "Equipe vtur" como vendedor de um recibo
      const { data: registroRec } = await client
        .from('conciliacao_recibos')
        .select('company_id')
        .eq('id', id)
        .maybeSingle();
      const companyIdRec = String(registroRec?.company_id || '').trim() || null;
      const equipeVturVendedor = await findEquipeVturVendedor(client, companyIdRec);
      if (equipeVturVendedor?.id && vendedor_id === equipeVturVendedor.id) {
        return json({ error: 'Não é permitido atribuir "Equipe vtur" como vendedor de um recibo.' }, { status: 422 });
      }

      const { data, error } = await client
        .from('conciliacao_recibos')
        .update({ ranking_vendedor_id: vendedor_id })
        .eq('id', id)
        .select('id, documento, ranking_vendedor_id');
      if (error) throw error;
      return json({ ok: true, updated: data });

    } else if (action === 'fix_valor') {
      const updates: Record<string, any> = {};
      if (body.valor_lancamentos != null) updates.valor_lancamentos = Number(body.valor_lancamentos);
      if (body.valor_venda_real != null) updates.valor_venda_real = Number(body.valor_venda_real);
      if (Object.keys(updates).length === 0) {
        return json({ error: 'Nenhum valor fornecido para atualizar' }, { status: 400 });
      }

      const { data, error } = await client
        .from('conciliacao_recibos')
        .update(updates)
        .eq('id', id)
        .select('id, documento, valor_lancamentos, valor_venda_real');
      if (error) throw error;
      return json({ ok: true, updated: data });

    } else {
      return json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('[ranking-debug] Erro POST:', err);
    return toErrorResponse(err, 'Erro na correção.');
  }
}
