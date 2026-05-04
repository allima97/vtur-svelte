import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import {
  buildClientePayload,
  createInitialClienteForm,
  fillClienteFormFromApi,
  type ClienteFormData,
  validateClienteForm
} from '$lib/features/clientes/form';
import {
  deriveClienteStatus,
  ensureClienteAccess,
  formatDocumentoDisplay,
  type ClienteScopedFilters
} from '$lib/server/clientes';
import { invalidateClientReadModels } from '$lib/server/readModelCache';

type ClienteRow = {
  id: string;
  nome: string | null;
  cpf: string | null;
  rg: string | null;
  telefone: string | null;
  email: string | null;
  whatsapp: string | null;
  nascimento: string | null;
  genero: string | null;
  nacionalidade: string | null;
  tipo_pessoa: string | null;
  tipo_cliente: string | null;
  classificacao: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cidade: string | null;
  estado: string | null;
  notas: string | null;
  tags: string[] | null;
  ativo: boolean | null;
  active: boolean | null;
  company_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const CLIENTE_SELECT_FIELDS =
  'id, nome, cpf, rg, telefone, email, whatsapp, nascimento, genero, nacionalidade, tipo_pessoa, tipo_cliente, classificacao, cep, endereco, numero, complemento, cidade, estado, notas, tags, ativo, active, company_id, created_by, created_at, updated_at';

async function fetchCliente(client: ReturnType<typeof getAdminClient>, id: string) {
  const { data, error } = await client
    .from('clientes')
    .select(CLIENTE_SELECT_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as ClienteRow | null;
}

async function fetchResumoRelacionamentos(
  client: ReturnType<typeof getAdminClient>,
  clienteId: string,
  filters: ClienteScopedFilters
) {
  let vendasQuery = client
    .from('vendas')
    .select('id, data_venda, valor_total', { count: 'exact' })
    .eq('cliente_id', clienteId)
    .eq('cancelada', false);

  if (filters.companyIds.length > 0) {
    vendasQuery = vendasQuery.in('company_id', filters.companyIds);
  }
  if (filters.vendedorIds.length > 0) {
    vendasQuery = vendasQuery.in('vendedor_id', filters.vendedorIds);
  }

  const { data: vendasData, error: vendasError } = await vendasQuery;

  if (vendasError) throw vendasError;

  let quotesQuery = client
    .from('quote')
    .select('id, created_at', { count: 'exact' })
    .eq('client_id', clienteId);

  if (filters.vendedorIds.length > 0) {
    quotesQuery = quotesQuery.in('created_by', filters.vendedorIds);
  }

  const { data: quotesData, error: quotesError } = await quotesQuery;

  if (quotesError) throw quotesError;

  const { count, error: acompanhantesError } = await client
    .from('cliente_acompanhantes')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
    .eq('ativo', true);

  if (acompanhantesError) throw acompanhantesError;

  const vendas = vendasData || [];
  const totalGasto = vendas.reduce(
    (acc: number, row: any) => acc + Number(row.valor_total || 0),
    0
  );
  const ultimaCompra = vendas.reduce<string | null>((acc, row: any) => {
    const current = String(row.data_venda || '').trim() || null;
    if (!current) return acc;
    return !acc || current > acc ? current : acc;
  }, null);

  return {
    total_gasto: totalGasto,
    total_viagens: vendas.length,
    total_orcamentos: quotesData?.length || 0,
    ultima_compra: ultimaCompra,
    acompanhantes_count: Number(count || 0)
  };
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || '').trim();

    const filters = await ensureClienteAccess(
      client,
      scope,
      id,
      event.url.searchParams.get('empresa_id'),
      event.url.searchParams.get('vendedor_ids'),
      1
    );

    const row = await fetchCliente(client, id);
    if (!row) return json({ error: 'Cliente nao encontrado.' }, { status: 404 });

    const resumo = await fetchResumoRelacionamentos(client, id, filters);

    return json({
      ...row,
      data_nascimento: row.nascimento,
      observacoes: row.notas,
      documento_formatado: formatDocumentoDisplay(row.cpf),
      status: deriveClienteStatus(row, resumo.ultima_compra),
      ...resumo
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar cliente.');
  }
}

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || '').trim();

    await ensureClienteAccess(
      client,
      scope,
      id,
      event.url.searchParams.get('empresa_id'),
      event.url.searchParams.get('vendedor_ids'),
      2
    );

    const existing = await fetchCliente(client, id);
    if (!existing) return json({ error: 'Cliente nao encontrado.' }, { status: 404 });

    const body = await event.request.json();
    const form: ClienteFormData = {
      ...createInitialClienteForm(),
      ...fillClienteFormFromApi(existing),
      ...fillClienteFormFromApi(body),
      nome: String(body?.nome ?? existing.nome ?? ''),
      cpf: String(body?.cpf ?? existing.cpf ?? ''),
      tipo_pessoa: body?.tipo_pessoa === 'PJ' || existing.tipo_pessoa === 'PJ' ? 'PJ' : 'PF',
      telefone: String(body?.telefone ?? existing.telefone ?? ''),
      whatsapp: String(body?.whatsapp ?? existing.whatsapp ?? ''),
      email: String(body?.email ?? existing.email ?? ''),
      classificacao: String(body?.classificacao ?? existing.classificacao ?? ''),
      endereco: String(body?.endereco ?? existing.endereco ?? ''),
      numero: String(body?.numero ?? existing.numero ?? ''),
      complemento: String(body?.complemento ?? existing.complemento ?? ''),
      cidade: String(body?.cidade ?? existing.cidade ?? ''),
      estado: String(body?.estado ?? existing.estado ?? ''),
      cep: String(body?.cep ?? existing.cep ?? ''),
      rg: String(body?.rg ?? existing.rg ?? ''),
      genero: String(body?.genero ?? existing.genero ?? ''),
      nacionalidade: String(body?.nacionalidade ?? existing.nacionalidade ?? ''),
      tags: Array.isArray(body?.tags)
        ? body.tags.join(', ')
        : body?.tags !== undefined
          ? String(body.tags || '')
          : Array.isArray(existing.tags)
            ? existing.tags.join(', ')
            : '',
      tipo_cliente: String(body?.tipo_cliente ?? existing.tipo_cliente ?? 'passageiro'),
      notas: String(body?.notas ?? body?.observacoes ?? existing.notas ?? ''),
      nascimento: String(body?.nascimento ?? body?.data_nascimento ?? existing.nascimento ?? ''),
      ativo: body?.ativo !== undefined ? Boolean(body.ativo) : existing.ativo !== false,
      active: body?.active !== undefined ? Boolean(body.active) : existing.active !== false
    };

    const validation = validateClienteForm(form);
    if (!validation.valid) {
      return json(
        { error: validation.firstError || 'Dados invalidos.', errors: validation.errors },
        { status: 400 }
      );
    }

    const payload = buildClientePayload(form);
    const { data, error: updateError } = await client
      .from('clientes')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(CLIENTE_SELECT_FIELDS)
      .single();

    if (updateError) throw updateError;

    invalidateClientReadModels({
      companyIds: data?.company_id ? [String(data.company_id)] : [],
      userId: user.id
    });

    return json({ cliente: data, message: 'Cliente atualizado com sucesso.' });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar cliente.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.params.id || '').trim();

    const filters = await ensureClienteAccess(
      client,
      scope,
      id,
      event.url.searchParams.get('empresa_id'),
      event.url.searchParams.get('vendedor_ids'),
      3
    );

    const { error: deleteError } = await client.from('clientes').delete().eq('id', id);
    if (deleteError) throw deleteError;

    invalidateClientReadModels({
      companyIds: filters.companyIds,
      userId: user.id
    });

    return json({ message: 'Cliente excluido com sucesso.' });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir cliente.');
  }
}
