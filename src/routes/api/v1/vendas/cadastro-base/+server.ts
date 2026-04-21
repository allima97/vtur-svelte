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

function getImportanceRank(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 9999;
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

    // cidades schema: id, nome, subdivisao_id — state comes from subdivisoes join (nome, codigo_admin1)
    const cidadesQuery = client
      .from('cidades')
      .select('id, nome, grau_importancia, subdivisao:subdivisoes(nome, codigo_admin1)')
      .order('grau_importancia', { ascending: true, nullsFirst: false })
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
      produtosRes,
      tiposRes,
      pacotesRes,
      formasRes
    ] = await Promise.all([
      clientesQuery,
      cidadesQuery,
      produtosQuery,
      tiposQuery,
      pacotesQuery,
      formasQuery
    ]);

    clientes = safeRows(clientesRes);
    const cidadesRaw = safeRows(cidadesRes);
    cidades = cidadesRaw
      .map((row: any) => {
      // subdivisoes.codigo_admin1 = state code (e.g. "SP"), subdivisoes.nome = state name
        const sub = row?.subdivisao;
        const estado = sub?.codigo_admin1 || sub?.nome || null;
        return {
          id: row.id,
          nome: row.nome,
          subdivisao: sub,
          estado,
          grau_importancia: row?.grau_importancia == null ? null : Number(row.grau_importancia),
          label: estado ? `${row?.nome || ''} (${estado})` : row?.nome || ''
        };
      })
      .sort((a: any, b: any) => {
        const importanceDiff = getImportanceRank(a?.grau_importancia) - getImportanceRank(b?.grau_importancia);
        if (importanceDiff !== 0) return importanceDiff;
        const nomeDiff = String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' });
        if (nomeDiff !== 0) return nomeDiff;
        return String(a?.estado || '').localeCompare(String(b?.estado || ''), 'pt-BR', { sensitivity: 'base' });
      });
    produtos = safeRows(produtosRes);
    tipos = safeRows(tiposRes);
    tiposPacote = safeRows(pacotesRes);
    formasPagamento = safeRows(formasRes);

    const warningParts: string[] = [];
    if (clientesRes?.error) warningParts.push('clientes');
    if (cidadesRes?.error) warningParts.push('cidades');
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
