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
    const password = String(body.password || "");
    const confirmEmail = body.confirm_email !== false;
    if (!password || password.length < 6) {
      return new Response("Senha obrigatoria com pelo menos 6 caracteres.", { status: 400 });
    }
    if (!userId && email) {
      userId = await findAuthUserIdByEmail(client, email) || "";
    }
    if (!userId) {
      return new Response("Usuario alvo nao informado.", { status: 400 });
    }
    await loadManagedUser(client, scope, userId);
    const { data, error: updateError } = await client.auth.admin.updateUserById(userId, {
      password,
      email_confirm: confirmEmail
    });
    if (updateError) throw updateError;
    return json({
      ok: true,
      user_id: userId,
      email: data.user?.email || null,
      updated_at: data.user?.updated_at || null
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao redefinir senha.");
  }
}
export {
  POST
};
