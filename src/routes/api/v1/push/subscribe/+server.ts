import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logServerError, requireAuthenticatedUser } from '$lib/server/v1';

const MAX_ENDPOINT_LENGTH = 2048;
const MAX_KEY_LENGTH = 512;

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await requireAuthenticatedUser({ locals } as any);
    const client = locals.supabase;

    const body = await request.json().catch(() => ({}));
    const subscription = body?.subscription || body;
    const endpoint = subscription?.endpoint;
    const keys = subscription?.keys || {};
    const p256dh = keys?.p256dh;
    const auth = keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return json({ error: "Subscription invalida." }, { status: 400 });
    }
    if (
      String(endpoint).length > MAX_ENDPOINT_LENGTH ||
      String(p256dh).length > MAX_KEY_LENGTH ||
      String(auth).length > MAX_KEY_LENGTH
    ) {
      return json({ error: "Subscription muito grande." }, { status: 413 });
    }
    try {
      const parsedEndpoint = new URL(String(endpoint));
      if (parsedEndpoint.protocol !== "https:") {
        return json({ error: "Endpoint invalido." }, { status: 400 });
      }
    } catch {
      return json({ error: "Endpoint invalido." }, { status: 400 });
    }

    const payload = {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent") || null,
      active: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from("push_subscriptions")
      .upsert(payload as any, { onConflict: "endpoint" });

    if (error) {
      logServerError("[push/subscribe] falha ao salvar subscription", error);
      return json({ error: "Erro ao salvar subscription." }, { status: 500 });
    }

    return json({ ok: true });
  } catch (error: any) {
    logServerError("[push/subscribe] falha interna", error);
    return json({ error: "Erro interno ao salvar subscription." }, { status: 500 });
  }
};
