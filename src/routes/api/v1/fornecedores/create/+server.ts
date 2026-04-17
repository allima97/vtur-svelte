import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { fetchFornecedorById, sanitizeFornecedorPayload } from '$lib/server/fornecedores';

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['cadastros', 'fornecedores'], 2, 'Sem permissão para criar fornecedores.');
    }

    const body = await event.request.json();
    const payload = sanitizeFornecedorPayload(body, scope);

    if (!payload.company_id) {
      return json({ error: 'Empresa do fornecedor não identificada.' }, { status: 400 });
    }
    if (!payload.nome_completo) {
      return json({ error: 'Nome completo é obrigatório.' }, { status: 400 });
    }
    if (!payload.nome_fantasia) {
      return json({ error: 'Nome fantasia é obrigatório.' }, { status: 400 });
    }
    if (!payload.cidade) {
      return json({ error: 'Cidade é obrigatória.' }, { status: 400 });
    }
    if (!payload.estado) {
      return json({ error: 'Estado é obrigatório.' }, { status: 400 });
    }
    if (!payload.telefone) {
      return json({ error: 'Telefone é obrigatório.' }, { status: 400 });
    }
    if (!payload.whatsapp) {
      return json({ error: 'WhatsApp é obrigatório.' }, { status: 400 });
    }
    if (!payload.telefone_emergencia) {
      return json({ error: 'Telefone de emergência é obrigatório.' }, { status: 400 });
    }
    if (!payload.responsavel) {
      return json({ error: 'Responsável é obrigatório.' }, { status: 400 });
    }
    if (!payload.principais_servicos) {
      return json({ error: 'Principais serviços são obrigatórios.' }, { status: 400 });
    }
    if (payload.localizacao === 'brasil' && !payload.cnpj) {
      return json({ error: 'CNPJ é obrigatório para fornecedores no Brasil.' }, { status: 400 });
    }
    if (payload.localizacao === 'brasil' && !payload.cep) {
      return json({ error: 'CEP é obrigatório para fornecedores no Brasil.' }, { status: 400 });
    }

    const { data, error } = await client.from('fornecedores').insert([payload]).select('id').single();
    if (error) throw error;

    const fornecedor = await fetchFornecedorById(client, data.id);
    return json({ success: true, data: fornecedor }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao criar fornecedor.');
  }
}
