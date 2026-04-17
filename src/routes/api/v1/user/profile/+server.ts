import { json } from '@sveltejs/kit';
import { getAdminClient, requireAuthenticatedUser, toErrorResponse } from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);

    const { data, error: queryError } = await client
      .from('users')
      .select(`
        id, nome_completo, cpf, data_nascimento, telefone, whatsapp,
        rg, cep, endereco, numero, complemento, cidade, estado, email, uso_individual,
        avatar_url, company_id, created_by_gestor, must_change_password,
        company:companies!company_id(nome_empresa, nome_fantasia, cnpj, endereco, telefone, cidade, estado)
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (queryError) throw queryError;
    if (!data) return json({ error: 'Perfil não encontrado.' }, { status: 404 });

    return json(data);
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar perfil.');
  }
}

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);

    const body = await event.request.json();

    // Campos que o usuário pode editar no próprio perfil (apenas colunas que existem no schema)
    const allowed = [
      'nome_completo', 'cpf', 'data_nascimento',
      'telefone', 'whatsapp', 'rg', 'cep', 'endereco', 'numero',
      'complemento', 'cidade', 'estado', 'uso_individual'
    ];

    const payload: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) {
        payload[key] = body[key] === '' ? null : body[key];
      }
    }

    if (Object.keys(payload).length === 0) {
      return json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }

    const { error: updateError } = await client.from('users').update(payload).eq('id', user.id);
    if (updateError) throw updateError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar perfil.');
  }
}
