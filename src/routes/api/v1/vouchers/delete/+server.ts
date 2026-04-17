import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    // Verifica escopo
    const { data: voucher } = await client.from('vouchers').select('id, company_id').eq('id', id).maybeSingle();
    if (!voucher) return json({ error: 'Voucher não encontrado.' }, { status: 404 });
    if (!scope.isAdmin && voucher.company_id !== scope.companyId) {
      return json({ error: 'Voucher fora do escopo.' }, { status: 403 });
    }

    const { error: deleteError } = await client.from('vouchers').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir voucher.');
  }
}
