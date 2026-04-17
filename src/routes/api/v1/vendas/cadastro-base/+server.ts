import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchGestorEquipeIdsComGestor,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

function isAllowedSellerTipo(tipoNome?: string | null) {
  const tipo = String(tipoNome || '').toUpperCase();
  return tipo.includes('VENDEDOR') || tipo.includes('GESTOR') || tipo.includes('MASTER');
}

function isIgnorableQueryError(err: any) {
  const code = String(err?.code || '');
  const message = String(err?.message || '');
  return code === 'PGRST205' || code === '42P01' || code === '42703' || message.includes('PGRST205') || message.includes('42P01') || message.includes('42703');
}

function safeRows<T = any>(result: any, options?: { optional?: boolean }) {
  const optional = options?.optional ?? true;
  const err = result?.error;
  if (err) {
    if (optional || isIgnorableQueryError(err)) return [] as T[];
    throw err;
  }
  return (result?.data || []) as T[];
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vendas_consulta', 'vendas', 'vendas_cadastro'], 1, 'Sem acesso a Vendas.');
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('empresa_id'));
    const activeCompanyIds = companyIds.length > 0 ? companyIds : scope.companyId ? [scope.companyId] : [];

    let vendedoresEquipe: Array<{ id: string; nome_completo: string | null }> = [
      { id: scope.userId, nome_completo: scope.nome || 'Você' }
    ];
    let clientes: any[] = [];
    let cidades: any[] = [];
    let produtos: any[] = [];
    let tipos: any[] = [];
    let tiposPacote: any[] = [];
    let formasPagamento: any[] = [];

    if (scope.isGestor && scope.companyId) {
      const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
      if (equipeIds.length > 0) {
        const { data } = await client
          .from('users')
          .select('id, nome_completo, user_types(name)')
          .in('id', equipeIds)
          .eq('active', true)
          .order('nome_completo');
        vendedoresEquipe = (data || []).filter((row: any) => isAllowedSellerTipo(row?.user_types?.name));
      }
    } else if (scope.isMaster && activeCompanyIds.length > 0) {
      const { data } = await client
        .from('users')
        .select('id, nome_completo, user_types(name)')
        .in('company_id', activeCompanyIds)
        .eq('active', true)
        .order('nome_completo');
      vendedoresEquipe = (data || []).filter((row: any) => isAllowedSellerTipo(row?.user_types?.name));
    }

    let clientesQuery = client
      .from('clientes')
      .select('id, nome, cpf, telefone, email, whatsapp, company_id')
      .order('nome', { ascending: true })
      .limit(5000);
    if (activeCompanyIds.length > 0) clientesQuery = clientesQuery.in('company_id', activeCompanyIds);

    const cidadesQuery = client.from('cidades').select('id, nome').order('nome', { ascending: true }).limit(5000);
    const cidadesEstadoQuery = client.from('cidades').select('id, estado').order('nome', { ascending: true }).limit(5000);
    const cidadesUfQuery = client.from('cidades').select('id, uf').order('nome', { ascending: true }).limit(5000);
    const cidadesSubdivisaoNomeQuery = client
      .from('cidades')
      .select('id, subdivisao_nome')
      .order('nome', { ascending: true })
      .limit(5000);
    const cidadesSubdivisaoRelQuery = client
      .from('cidades')
      .select('id, subdivisao:subdivisoes(nome, sigla)')
      .order('nome', { ascending: true })
      .limit(5000);
    const produtosQuery = client
      .from('produtos')
      .select('id, nome, cidade_id, tipo_produto, destino, todas_as_cidades, ativo, informacoes_importantes, fornecedor_id')
      .order('nome', { ascending: true })
      .limit(2000);
    const tiposQuery = client.from('tipo_produtos').select('id, nome, tipo').order('nome', { ascending: true }).limit(200);
    const pacotesQuery = client.from('tipo_pacotes').select('id, nome, ativo').order('nome', { ascending: true }).limit(200);
    const formasQuery = client
      .from('formas_pagamento')
      .select('id, nome, paga_comissao, permite_desconto, desconto_padrao_pct')
      .order('nome', { ascending: true })
      .limit(200);

    const [
      clientesRes,
      cidadesRes,
      cidadesEstadoRes,
      cidadesUfRes,
      cidadesSubdivisaoNomeRes,
      cidadesSubdivisaoRelRes,
      produtosRes,
      tiposRes,
      pacotesRes,
      formasRes
    ] = await Promise.all([
      clientesQuery,
      cidadesQuery,
      cidadesEstadoQuery,
      cidadesUfQuery,
      cidadesSubdivisaoNomeQuery,
      cidadesSubdivisaoRelQuery,
      produtosQuery,
      tiposQuery,
      pacotesQuery,
      formasQuery
    ]);

    clientes = safeRows(clientesRes);
    const cidadesBase = safeRows(cidadesRes);
    const cidadesEstado = safeRows(cidadesEstadoRes);
    const cidadesUf = safeRows(cidadesUfRes);
    const cidadesSubdivisaoNome = safeRows(cidadesSubdivisaoNomeRes);
    const cidadesSubdivisaoRel = safeRows(cidadesSubdivisaoRelRes);
    const cidadesById = new Map<string, any>();
    cidadesBase.forEach((row: any) => cidadesById.set(String(row.id), { ...row }));
    cidadesEstado.forEach((row: any) => {
      const entry = cidadesById.get(String(row.id));
      if (entry) entry.estado = row?.estado || entry.estado || null;
    });
    cidadesUf.forEach((row: any) => {
      const entry = cidadesById.get(String(row.id));
      if (entry) entry.uf = row?.uf || entry.uf || null;
    });
    cidadesSubdivisaoNome.forEach((row: any) => {
      const entry = cidadesById.get(String(row.id));
      if (entry) entry.subdivisao_nome = row?.subdivisao_nome || entry.subdivisao_nome || null;
    });
    cidadesSubdivisaoRel.forEach((row: any) => {
      const entry = cidadesById.get(String(row.id));
      if (entry) entry.subdivisao = row?.subdivisao || entry.subdivisao || null;
    });
    cidades = Array.from(cidadesById.values()).map((row: any) => {
      const estado =
        row?.estado ||
        row?.uf ||
        row?.subdivisao_nome ||
        row?.subdivisao?.sigla ||
        row?.subdivisao?.nome ||
        null;
      return {
        ...row,
        estado,
        label: estado ? `${row?.nome || ''} (${estado})` : row?.nome || ''
      };
    });
    produtos = safeRows(produtosRes);
    tipos = safeRows(tiposRes);
    tiposPacote = safeRows(pacotesRes);
    formasPagamento = safeRows(formasRes);

    const warningParts: string[] = [];
    if (clientesRes?.error) warningParts.push('clientes');
    if (cidadesRes?.error) warningParts.push('cidades');
    if (cidadesEstadoRes?.error) warningParts.push('cidades.estado');
    if (cidadesUfRes?.error) warningParts.push('cidades.uf');
    if (cidadesSubdivisaoNomeRes?.error) warningParts.push('cidades.subdivisao_nome');
    if (cidadesSubdivisaoRelRes?.error) warningParts.push('cidades.subdivisoes');
    if (produtosRes?.error) warningParts.push('produtos');
    if (tiposRes?.error) warningParts.push('tipo_produtos');
    if (pacotesRes?.error) warningParts.push('tipo_pacotes');
    if (formasRes?.error) warningParts.push('formas_pagamento');
    const warning = warningParts.length > 0 ? `Falha parcial em: ${warningParts.join(', ')}` : null;

    return json({
      user: {
        id: scope.userId,
        papel: scope.papel,
        company_id: scope.companyId,
        uso_individual: scope.usoIndividual,
        is_gestor: scope.isGestor,
        can_assign_vendedor: scope.isGestor || scope.isMaster || scope.isAdmin
      },
      vendedoresEquipe,
      clientes,
      cidades,
      produtos: produtos
        .filter((row: any) => row?.ativo !== false)
        .map((row: any) => ({
          ...row,
          todas_as_cidades: row?.todas_as_cidades === true || (!row?.cidade_id && row?.todas_as_cidades !== false)
        })),
      tipos,
      tiposPacote,
      formasPagamento,
      warning
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar base do cadastro de vendas.');
  }
}
