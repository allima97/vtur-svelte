import { json } from '@sveltejs/kit';
import { loadAvisoTemplates } from '$lib/server/admin';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

function inferTipo(nome: string) {
  const value = String(nome || '').trim().toLowerCase();
  if (value.includes('anivers')) return 'aniversario';
  if (value.includes('promo')) return 'promocao';
  if (value.includes('confirm')) return 'confirmacao';
  if (value.includes('follow')) return 'follow_up';
  return 'geral';
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['clientes', 'vendas'], 1, 'Sem acesso aos avisos do cliente.');
    }

    const templates = await loadAvisoTemplates(client);
    return json({
      items: templates
        .filter((item: any) => item.ativo !== false)
        .map((item: any) => ({
          id: item.id,
          nome: item.nome,
          tipo: inferTipo(item.nome),
          assunto: item.assunto || '',
          conteudo: item.mensagem || '',
          sender_key: item.sender_key || 'avisos'
        }))
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar templates de aviso.');
  }
}
