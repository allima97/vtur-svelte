import type { RequestEvent } from '@sveltejs/kit';
import { requireAuthenticatedUser, resolveUserScope, ensureModuloAccess, getAdminClient } from '$lib/server/v1';
import { titleCaseNome } from '$lib/normalizeText';

export async function POST(event: RequestEvent) {
  try {
    const user = await requireAuthenticatedUser(event);
    const client = getAdminClient();
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['Orcamentos'], 2, 'Sem acesso para criar Orcamentos.');

    const body = await event.request.json().catch(() => null);
    const nome = titleCaseNome(String(body?.nome || '').trim());
    const telefone = String(body?.telefone || '').trim();
    if (!nome || !telefone) return new Response('Nome e telefone obrigatorios.', { status: 400 });

    const payload: Record<string, any> = {
      nome,
      telefone,
      whatsapp: telefone,
      ativo: true,
      active: true
    };
    if (scope.companyId) payload.company_id = scope.companyId;

    const { data, error } = await client
      .from('clientes')
      .insert(payload)
      .select('id, nome, cpf, whatsapp, email')
      .single();
    if (error || !data) throw error || new Error('Falha ao criar cliente.');

    return new Response(JSON.stringify({ item: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Erro orcamentos/cliente-create', err);
    return new Response('Erro ao criar cliente.', { status: 500 });
  }
}
