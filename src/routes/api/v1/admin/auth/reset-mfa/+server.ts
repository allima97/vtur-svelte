import { json } from '@sveltejs/kit';
import {
  ensureCanManageUsers,
  findAuthUserIdByEmail,
  loadManagedUser
} from '$lib/server/admin';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));

    ensureCanManageUsers(scope);

    let userId = String(body.user_id || '').trim();
    const email = String(body.email || '').trim().toLowerCase();

    if (!userId && email) {
      userId = (await findAuthUserIdByEmail(client, email)) || '';
    }

    if (!userId) {
      return new Response('Usuario alvo nao informado.', { status: 400 });
    }

    await loadManagedUser(client, scope, userId);

    const { data: factorsData, error: factorsError } = await client.auth.admin.mfa.listFactors({ userId });
    if (factorsError) throw factorsError;

    const deletedIds: string[] = [];
    for (const factor of factorsData?.factors || []) {
      const factorId = String((factor as any).id || '').trim();
      if (!factorId) continue;
      const { error: deleteError } = await client.auth.admin.mfa.deleteFactor({ userId, id: factorId });
      if (deleteError) throw deleteError;
      deletedIds.push(factorId);
    }

    return json({
      ok: true,
      user_id: userId,
      deleted_count: deletedIds.length,
      deleted_ids: deletedIds
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao resetar MFA.');
  }
}
