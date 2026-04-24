import { json } from '@sveltejs/kit';
import {
  fetchGestorEquipeIdsComGestor,
  getAdminClient,
  parseUuidList,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const { searchParams } = event.url;
    const companyIds = resolveScopedCompanyIds(
      scope,
      searchParams.get('company_id') || searchParams.get('empresa_id')
    );
    const requestedVendedorIds = parseUuidList(
      searchParams.get('vendedor_ids') || searchParams.get('vendedor_id')
    );
    const tipoNome = String(scope.tipoNome || '').toUpperCase();

    const hoje = new Date().toISOString().slice(0, 10);
    const em30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let vendedorIds: string[] = [];
    if (tipoNome.includes('ADMIN')) {
      vendedorIds = requestedVendedorIds;
    } else if (tipoNome.includes('GESTOR')) {
      const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
      vendedorIds = requestedVendedorIds.length > 0
        ? requestedVendedorIds.filter((id) => equipeIds.includes(id))
        : equipeIds;
    } else if (tipoNome.includes('MASTER')) {
      vendedorIds = requestedVendedorIds;
    } else {
      vendedorIds = [scope.userId];
    }

    // Viagens próximas (embarque nos próximos 30 dias)
    let vendasQuery = client
      .from('vendas')
      .select(`
        id, numero_venda, data_embarque, data_final, cancelada,
        cliente:clientes!cliente_id(id, nome, whatsapp, telefone),
        vendedor:users!vendedor_id(id, nome_completo),
        destino:produtos!destino_id(nome),
        destino_cidade:cidades!destino_cidade_id(nome)
      `)
      .eq('cancelada', false)
      .gte('data_embarque', hoje)
      .lte('data_embarque', em30dias)
      .order('data_embarque')
      .limit(100);

    if (companyIds.length > 0) vendasQuery = vendasQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) vendasQuery = vendasQuery.in('vendedor_id', vendedorIds);

    const { data: vendas, error: vendasError } = await vendasQuery;
    if (vendasError) throw vendasError;

    // Viagens em andamento (embarque <= hoje <= data_final)
    let emAndamentoQuery = client
      .from('vendas')
      .select(`
        id, numero_venda, data_embarque, data_final, cancelada,
        cliente:clientes!cliente_id(id, nome, whatsapp, telefone),
        destino:produtos!destino_id(nome),
        destino_cidade:cidades!destino_cidade_id(nome)
      `)
      .eq('cancelada', false)
      .lte('data_embarque', hoje)
      .gte('data_final', hoje)
      .order('data_embarque')
      .limit(50);

    if (companyIds.length > 0) emAndamentoQuery = emAndamentoQuery.in('company_id', companyIds);
    if (vendedorIds.length > 0) emAndamentoQuery = emAndamentoQuery.in('vendedor_id', vendedorIds);

    const { data: emAndamento } = await emAndamentoQuery;

    return json({
      proximas: (vendas || []).map((v: any) => ({
        id: v.id,
        numero_venda: v.numero_venda,
        data_embarque: v.data_embarque,
        data_final: v.data_final,
        cliente_nome: v.cliente?.nome || 'Cliente',
        cliente_whatsapp: v.cliente?.whatsapp || v.cliente?.telefone || null,
        destino: v.destino?.nome || v.destino_cidade?.nome || 'Destino',
        vendedor_nome: v.vendedor?.nome_completo || null
      })),
      em_andamento: (emAndamento || []).map((v: any) => ({
        id: v.id,
        numero_venda: v.numero_venda,
        data_embarque: v.data_embarque,
        data_final: v.data_final,
        cliente_nome: v.cliente?.nome || 'Cliente',
        cliente_whatsapp: v.cliente?.whatsapp || v.cliente?.telefone || null,
        destino: v.destino?.nome || v.destino_cidade?.nome || 'Destino'
      })),
      total_proximas: (vendas || []).length,
      total_em_andamento: (emAndamento || []).length
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar viagens do dashboard.');
  }
}
