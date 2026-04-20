import { json } from "@sveltejs/kit";
import { e as ensureCanManageUsers, l as loadManagedUser } from "../../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
function normalizeUserIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.map((item) => String(item || "").trim()).filter((item) => /^[0-9a-f-]{36}$/i.test(item))
    )
  );
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    ensureCanManageUsers(scope);
    const userIds = normalizeUserIds(body.user_ids);
    const statuses = {};
    for (const userId of userIds) {
      await loadManagedUser(client, scope, userId);
      const { data, error: factorsError } = await client.auth.admin.mfa.listFactors({ userId });
      if (factorsError) {
        statuses[userId] = { enabled: false, verified_count: 0, factor_count: 0 };
        continue;
      }
      const factors = data?.factors || [];
      const verifiedCount = factors.filter((factor) => String(factor.status || "") === "verified").length;
      statuses[userId] = {
        enabled: verifiedCount > 0,
        verified_count: verifiedCount,
        factor_count: factors.length
      };
    }
    return json({ available: true, statuses });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar status de MFA.");
  }
}
export {
  POST
};
