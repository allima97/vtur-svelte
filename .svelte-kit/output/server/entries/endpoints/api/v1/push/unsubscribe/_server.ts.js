import { json } from "@sveltejs/kit";
import { r as requireAuthenticatedUser } from "../../../../../../chunks/v1.js";
const POST = async ({ request, locals }) => {
  try {
    const user = await requireAuthenticatedUser({ locals });
    const client = locals.supabase;
    const body = await request.json().catch(() => ({}));
    const endpoint = body?.endpoint;
    if (!endpoint) {
      return json({ error: "Endpoint invalido." }, { status: 400 });
    }
    const { error } = await client.from("push_subscriptions").update({ active: false, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("endpoint", endpoint).eq("user_id", user.id);
    if (error) {
      return json({ error: `Erro ao desativar subscription: ${error.message}` }, { status: 500 });
    }
    return json({ ok: true });
  } catch (error) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};
export {
  POST
};
