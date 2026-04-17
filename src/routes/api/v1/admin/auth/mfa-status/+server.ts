import { json } from '@sveltejs/kit';
import { ensureCanManageUsers, loadManagedUser } from '$lib/server/admin';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

function normalizeUserIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item || '').trim())
        .filter((item) => /^[0-9a-f-]{36}$/i.test(item))
    )
  );
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));

    ensureCanManageUsers(scope);

    const userIds = normalizeUserIds(body.user_ids);
    const statuses: Record<string, { enabled: boolean; verified_count: number; factor_count: number }> = {};

    for (const userId of userIds) {
      await loadManagedUser(client, scope, userId);

      const { data, error: factorsError } = await client.auth.admin.mfa.listFactors({ userId });
      if (factorsError) {
        statuses[userId] = { enabled: false, verified_count: 0, factor_count: 0 };
        continue;
      }

      const factors = (data?.factors || []) as Array<{ status?: string | null }>;
      const verifiedCount = factors.filter((factor) => String(factor.status || '') === 'verified').length;

      statuses[userId] = {
        enabled: verifiedCount > 0,
        verified_count: verifiedCount,
        factor_count: factors.length
      };
    }

    return json({ available: true, statuses });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar status de MFA.');
  }
}
