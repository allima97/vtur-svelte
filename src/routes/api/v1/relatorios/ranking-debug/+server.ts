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
  toErrorResponse
} from '$lib/server/v1';

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
        .select('id, documento, status, descricao, movimento_data, valor_lancamentos, valor_venda_real, valor_taxas, ranking_vendedor_id, company_id')
        .in('ranking_vendedor_id', userIds)
        .gte('movimento_data', inicio)
        .lte('movimento_data', fim)
        .order('movimento_data', { ascending: true });
      if (concErr) throw concErr;

      const totalBruto = (concRows || []).reduce((s: number, r: any) => s + Number(r.valor_lancamentos || 0), 0);
      const totalReal = (concRows || []).reduce((s: number, r: any) => s + Number(r.valor_venda_real || 0), 0);

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
        total_real_conciliacao: Math.round(totalReal * 100) / 100,
        recibos_atribuidos_ao_vendedor: (concRows || []).map((r: any) => ({
          ...r,
          ranking_vendedor_nome: userNomes[r.ranking_vendedor_id] || r.ranking_vendedor_id,
        })),
        possiveis_recibos_desviados: concAtribuicaoOutros,
        resumo: {
          atribuidos: concRows?.length || 0,
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
