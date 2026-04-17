import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
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

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['clientes'], 2, 'Sem permissao para criar clientes.');
    }

    const body = await event.request.json();

    // ✅ Valida company_id contra o escopo do usuário
    const requestedCompanyId = String(body?.company_id || '').trim();
    const allowedCompanyIds = resolveScopedCompanyIds(scope, requestedCompanyId || null);

    // Para admin sem company_id explícito, usa o primeiro disponível ou null
    let companyId: string | null = null;
    if (scope.isAdmin) {
      companyId = isUuid(requestedCompanyId) ? requestedCompanyId : null;
    } else {
      // Não-admin: company_id deve estar no escopo
      companyId = allowedCompanyIds[0] ?? null;
      if (!companyId) {
        return json({ error: 'Empresa não identificada para criar cliente.' }, { status: 400 });
      }
      // Se passou company_id explícito, confirma que está no escopo
      if (isUuid(requestedCompanyId) && !allowedCompanyIds.includes(requestedCompanyId)) {
        return json({ error: 'company_id fora do escopo.' }, { status: 403 });
      }
      if (isUuid(requestedCompanyId)) companyId = requestedCompanyId;
    }

    const form: ClienteFormData = {
      ...createInitialClienteForm(),
      ...fillClienteFormFromApi(body),
      nome: String(body?.nome || ''),
      cpf: String(body?.cpf || body?.cnpj || ''),
      tipo_pessoa: body?.tipo_pessoa === 'PJ' ? 'PJ' : 'PF',
      telefone: String(body?.telefone || ''),
      whatsapp: String(body?.whatsapp || ''),
      email: String(body?.email || ''),
      classificacao: String(body?.classificacao || ''),
      endereco: String(body?.endereco || ''),
      numero: String(body?.numero || ''),
      complemento: String(body?.complemento || ''),
      cidade: String(body?.cidade || ''),
      estado: String(body?.estado || ''),
      cep: String(body?.cep || ''),
      rg: String(body?.rg || ''),
      genero: String(body?.genero || ''),
      nacionalidade: String(body?.nacionalidade || ''),
      tags: Array.isArray(body?.tags) ? body.tags.join(', ') : String(body?.tags || ''),
      tipo_cliente: String(body?.tipo_cliente || 'passageiro'),
      notas: String(body?.notas || body?.observacoes || ''),
      ativo: body?.ativo !== false,
      active: body?.active !== false
    };

    const validation = validateClienteForm(form);
    if (!validation.valid) {
      return json(
        { error: validation.firstError || 'Dados invalidos.', errors: validation.errors },
        { status: 400 }
      );
    }

    const payload = buildClientePayload(form);
    const { data, error: insertError } = await client
      .from('clientes')
      .insert([{ ...payload, company_id: companyId, created_by: user.id }])
      .select(
        'id, nome, cpf, nascimento, telefone, whatsapp, email, classificacao, tipo_pessoa, tipo_cliente, cidade, estado, tags, notas, ativo, active, company_id, created_at'
      )
      .single();

    if (insertError) throw insertError;

    return json({ success: true, data, message: 'Cliente criado com sucesso.' });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao criar cliente.');
  }
}
