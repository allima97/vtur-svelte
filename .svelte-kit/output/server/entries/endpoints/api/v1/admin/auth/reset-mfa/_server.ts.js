import { json } from "@sveltejs/kit";
import { e as ensureCanManageUsers, f as findAuthUserIdByEmail, l as loadManagedUser } from "../../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    ensureCanManageUsers(scope);
    let userId = String(body.user_id || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    if (!userId && email) {
      userId = await findAuthUserIdByEmail(client, email) || "";
    }
    if (!userId) {
      return new Response("Usuario alvo nao informado.", { status: 400 });
    }
    await loadManagedUser(client, scope, userId);
    const { data: factorsData, error: factorsError } = await client.auth.admin.mfa.listFactors({ userId });
    if (factorsError) throw factorsError;
    const deletedIds = [];
    for (const factor of factorsData?.factors || []) {
      const factorId = String(factor.id || "").trim();
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
    return toErrorResponse(err, "Erro ao resetar MFA.");
  }
}
export {
  POST
};
